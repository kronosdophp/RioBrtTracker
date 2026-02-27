#include <boost/beast/core.hpp>
#include <boost/beast/http.hpp>
#include <boost/beast/version.hpp>
#include <boost/beast/ssl.hpp>
#include <boost/asio.hpp>
#include <boost/asio/ssl.hpp>
#include <boost/json.hpp>
#include <iostream>
#include <string>
#include <thread>
#include <vector>
#include <atomic>
#include <chrono>
#include <ctime>
#include <iomanip>
#include <sstream>
#include <memory>

namespace beast = boost::beast;
namespace http = beast::http;
namespace net = boost::asio;
namespace ssl = boost::asio::ssl;
namespace json = boost::json;
using tcp = net::ip::tcp;

// ============================================================
// BRTDataFetcher - Busca dados da API de mobilidade do Rio
// ============================================================
class BRTDataFetcher {
private:
    net::io_context ioc_;
    ssl::context ctx_;
    std::vector<json::value> veiculos_;
    std::mutex mutex_;
    std::atomic<bool> running_{ true };
    std::thread fetch_thread_;
    int consecutive_errors_{ 0 };
    static constexpr int BASE_INTERVAL_S = 20;
    static constexpr int MAX_BACKOFF_S = 120;

public:
    BRTDataFetcher() : ctx_(ssl::context::tlsv12_client) {
        ctx_.set_verify_mode(ssl::verify_none);
        try {
            ctx_.set_default_verify_paths();
        }
        catch (...) {}
    }

    ~BRTDataFetcher() {
        stop_fetching();
    }

    void start_fetching() {
        fetch_thread_ = std::thread([this]() {
            while (running_) {
                fetch_data();
                // Backoff exponencial: 20s -> 40s -> 80s -> 120s max
                int wait = BASE_INTERVAL_S;
                if (consecutive_errors_ > 0) {
                    wait = std::min(
                        BASE_INTERVAL_S * (1 << consecutive_errors_),
                        MAX_BACKOFF_S
                    );
                    std::cout << "[BACKOFF] Aguardando " << wait
                        << "s (erros: " << consecutive_errors_ << ")" << std::endl;
                }
                std::this_thread::sleep_for(std::chrono::seconds(wait));
            }
            });
    }

    void stop_fetching() {
        running_ = false;
        if (fetch_thread_.joinable()) {
            fetch_thread_.join();
        }
    }

    json::value get_veiculos() {
        std::lock_guard<std::mutex> lock(mutex_);
        json::array arr;
        for (const auto& v : veiculos_) {
            arr.push_back(v);
        }
        return arr;
    }

private:
    void fetch_data() {
        try {
            tcp::resolver resolver(ioc_);
            auto const results = resolver.resolve("dados.mobilidade.rio", "443");

            beast::tcp_stream stream(ioc_);
            stream.connect(results);

            ssl::stream<beast::tcp_stream&> ssl_stream(stream, ctx_);
            ssl_stream.set_verify_mode(ssl::verify_none);
            ssl_stream.handshake(ssl::stream_base::client);

            http::request<http::string_body> req{ http::verb::get, "/gps/brt", 11 };
            req.set(http::field::host, "dados.mobilidade.rio");
            req.set(http::field::user_agent,
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36");
            req.set(http::field::accept,
                "text/html,application/xhtml+xml,application/xml;q=0.9,"
                "image/avif,image/webp,image/apng,*/*;q=0.8");
            req.set("accept-language", "pt-BR,pt;q=0.7");
            req.set("sec-ch-ua",
                "\"Not:A-Brand\";v=\"99\", \"Brave\";v=\"145\", \"Chromium\";v=\"145\"");
            req.set("sec-ch-ua-mobile", "?0");
            req.set("sec-ch-ua-platform", "\"Windows\"");
            req.set("sec-fetch-dest", "document");
            req.set("sec-fetch-mode", "navigate");
            req.set("sec-fetch-site", "none");
            req.set("sec-fetch-user", "?1");
            req.set("sec-gpc", "1");
            req.set("upgrade-insecure-requests", "1");
            req.set(http::field::cache_control, "max-age=0");
            req.set(http::field::connection, "close");
            req.set(http::field::cookie,
                "connect.sid=s%3AMAzjv9FOqsyof409TsEiYFTWiKeQN7Vw"
                ".VaZVIzN62C1bxup3LqTvjv769ZPF1lkiPbc0rauPvKE");

            http::write(ssl_stream, req);

            beast::flat_buffer buffer;
            http::response<http::string_body> res;
            http::read(ssl_stream, buffer, res);

            if (res.result() == http::status::ok) {
                const auto& body = res.body();
                if (body.empty()) {
                    std::cerr << "[ERRO] Resposta vazia da API" << std::endl;
                    consecutive_errors_++;
                }
                else {
                    // Valida que e JSON antes de parsear
                    size_t start = body.find_first_not_of(" \t\n\r");
                    if (start == std::string::npos || (body[start] != '{' && body[start] != '[')) {
                        std::cerr << "[ERRO] Resposta nao e JSON (inicio: '"
                            << body.substr(0, std::min(body.size(), (size_t)30))
                            << "')" << std::endl;
                        consecutive_errors_++;
                    }
                    else {
                        try {
                            auto value = json::parse(body);
                            process_response(value);
                            consecutive_errors_ = 0;
                            std::cout << "[OK] Dados recebidos com sucesso!" << std::endl;
                        }
                        catch (const std::exception& pe) {
                            std::cerr << "[ERRO] JSON parse: " << pe.what() << std::endl;
                            consecutive_errors_++;
                        }
                    }
                }
            }
            else if (res.result_int() == 429) {
                std::cerr << "[AVISO] Rate limit (429). Aumentando intervalo..." << std::endl;
                consecutive_errors_++;
            }
            else {
                std::cerr << "[ERRO] HTTP " << res.result_int() << std::endl;
                consecutive_errors_++;
            }

            beast::error_code ec;
            ssl_stream.shutdown(ec);
            stream.socket().shutdown(tcp::socket::shutdown_both, ec);
        }
        catch (const std::exception& e) {
            std::cerr << "[ERRO] Conexao: " << e.what() << std::endl;
            consecutive_errors_++;
        }
    }

    void process_response(const json::value& data) {
        try {
            if (!data.is_object()) {
                std::cerr << "[ERRO] Resposta nao e um objeto" << std::endl;
                return;
            }

            auto obj = data.as_object();
            if (!obj.contains("veiculos")) {
                std::cerr << "[ERRO] Resposta nao contem chave 'veiculos'" << std::endl;
                return;
            }

            const auto& veiculos_array = obj.at("veiculos");
            if (!veiculos_array.is_array()) {
                std::cerr << "[ERRO] Campo 'veiculos' nao e um array" << std::endl;
                return;
            }

            std::lock_guard<std::mutex> lock(mutex_);
            veiculos_.clear();

            for (const auto& item : veiculos_array.as_array()) {
                if (!item.is_object()) continue;

                auto v = item.as_object();
                json::object veiculo;

                veiculo["id"] = v.contains("codigo") ? v.at("codigo") : json::value(nullptr);
                veiculo["veiculo"] = v.contains("codigo") ? v.at("codigo") : json::value(nullptr);
                veiculo["linha"] = v.contains("linha") ? v.at("linha") : json::value(nullptr);
                veiculo["latitude"] = v.contains("latitude") ? v.at("latitude") : json::value(nullptr);
                veiculo["longitude"] = v.contains("longitude") ? v.at("longitude") : json::value(nullptr);
                veiculo["velocidade"] = v.contains("velocidade") ? v.at("velocidade") : json::value(nullptr);
                veiculo["sentido"] = v.contains("sentido") ? v.at("sentido") : json::value(nullptr);
                veiculo["datahora"] = v.contains("dataHora") ? v.at("dataHora") : json::value(nullptr);
                veiculo["trajeto"] = v.contains("trajeto") ? v.at("trajeto") : json::value(nullptr);
                veiculo["ignicao"] = v.contains("ignicao") ? v.at("ignicao") : json::value(nullptr);
                veiculo["direcao"] = v.contains("direcao") ? v.at("direcao") : json::value(nullptr);
                veiculo["placa"] = v.contains("placa") ? v.at("placa") : json::value(nullptr);

                auto now = std::chrono::system_clock::now();
                auto timestamp = std::chrono::duration_cast<std::chrono::seconds>(
                    now.time_since_epoch()).count();
                veiculo["timestamp"] = timestamp;

                veiculos_.push_back(veiculo);
            }

            std::cout << "[INFO] " << veiculos_.size() << " veiculos atualizados" << std::endl;
        }
        catch (const std::exception& e) {
            std::cerr << "[ERRO] Processamento: " << e.what() << std::endl;
        }
    }
};

// ============================================================
// BRTServer - Servidor HTTP (API REST pura, sem HTML)
// ============================================================
class BRTServer {
private:
    net::io_context& ioc_;
    tcp::acceptor acceptor_;
    BRTDataFetcher& fetcher_;

public:
    BRTServer(net::io_context& ioc, short port, BRTDataFetcher& fetcher)
        : ioc_(ioc)
        , acceptor_(ioc, tcp::endpoint(tcp::v4(), port))
        , fetcher_(fetcher) {
        std::cout << "========================================" << std::endl;
        std::cout << "  BRT Rio - Backend API (C++)" << std::endl;
        std::cout << "  Porta: " << port << std::endl;
        std::cout << "  Endpoint: http://localhost:" << port << "/api/veiculos" << std::endl;
        std::cout << "========================================" << std::endl;
    }

    void run() {
        fetcher_.start_fetching();
        do_accept();
    }

private:
    void do_accept() {
        acceptor_.async_accept([this](beast::error_code ec, tcp::socket socket) {
            if (!ec) {
                std::make_shared<http_connection>(std::move(socket), *this)->start();
            }
            do_accept();
            });
    }

    class http_connection : public std::enable_shared_from_this<http_connection> {
    private:
        tcp::socket socket_;
        BRTServer& server_;
        beast::flat_buffer buffer_;
        http::request<http::string_body> req_;

    public:
        http_connection(tcp::socket socket, BRTServer& server)
            : socket_(std::move(socket)), server_(server) {
        }

        void start() {
            read_request();
        }

    private:
        void read_request() {
            auto self = shared_from_this();
            http::async_read(socket_, buffer_, req_,
                [self](beast::error_code ec, std::size_t) {
                    if (!ec) {
                        self->process_request();
                    }
                });
        }

        void process_request() {
            http::response<http::string_body> res;
            res.version(req_.version());
            res.keep_alive(false);
            res.set(http::field::server, "BRT Monitor API");

            // Headers CORS para aceitar requests do Next.js (localhost:3000)
            res.set(http::field::access_control_allow_origin, "*");
            res.set(http::field::access_control_allow_methods, "GET, OPTIONS");
            res.set(http::field::access_control_allow_headers, "Content-Type, Accept");
            res.set(http::field::cache_control, "no-cache");

            // Preflight CORS (OPTIONS)
            if (req_.method() == http::verb::options) {
                res.result(http::status::ok);
                res.body() = "";
                res.prepare_payload();
                write_response(std::move(res));
                return;
            }

            if (req_.method() == http::verb::get) {
                if (req_.target() == "/api/veiculos") {
                    res.result(http::status::ok);
                    res.set(http::field::content_type, "application/json; charset=utf-8");
                    res.body() = json::serialize(server_.fetcher_.get_veiculos());
                }
                else if (req_.target() == "/") {
                    // Redireciona para o frontend Next.js
                    res.result(http::status::ok);
                    res.set(http::field::content_type, "text/html; charset=utf-8");
                    res.body() = R"(<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>BRT API</title></head>
<body style="font-family:sans-serif;padding:40px;background:#1a1b2e;color:#e2e8f0">
<h1>BRT Rio - API Backend</h1>
<p>Este servidor e a API backend. O frontend esta em <a href="http://localhost:3000" style="color:#22d3ee">http://localhost:3000</a></p>
<h3>Endpoints:</h3>
<ul>
<li><a href="/api/veiculos" style="color:#22d3ee">GET /api/veiculos</a> - JSON com todos os veiculos</li>
</ul>
</body></html>)";
                }
                else {
                    res.result(http::status::not_found);
                    res.set(http::field::content_type, "application/json");
                    res.body() = R"({"error":"Rota nao encontrada"})";
                }
            }
            else {
                res.result(http::status::method_not_allowed);
                res.set(http::field::content_type, "application/json");
                res.body() = R"({"error":"Metodo nao permitido"})";
            }

            res.prepare_payload();
            write_response(std::move(res));
        }

        void write_response(http::response<http::string_body> res) {
            auto self = shared_from_this();
            auto res_ptr = std::make_shared<http::response<http::string_body>>(std::move(res));

            http::async_write(socket_, *res_ptr,
                [self, res_ptr](beast::error_code ec, std::size_t) {
                    self->socket_.shutdown(tcp::socket::shutdown_send, ec);
                });
        }
    };
};

// ============================================================
// Main
// ============================================================
int main() {
    try {
        net::io_context ioc;
        BRTDataFetcher fetcher;
        BRTServer server(ioc, 8080, fetcher);

        std::cout << std::endl;
        std::cout << "Backend iniciado! Aguardando conexoes..." << std::endl;
        std::cout << "Frontend Next.js: http://localhost:3000" << std::endl;
        std::cout << std::endl;

        server.run();
        ioc.run();
    }
    catch (const std::exception& e) {
        std::cerr << "[FATAL] " << e.what() << std::endl;
        return 1;
    }

    return 0;
}
