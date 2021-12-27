defmodule AmpsWeb.Webhook do
  use Plug.Router
  # use Plug.Debugger

  plug(Plug.Logger)
  plug(:match)

  plug(Plug.Parsers,
    parsers: [:json, :urlencoded, {:multipart, length: 1_000_000_000}],
    pass: ["application/json", "text/json"],
    json_decoder: Jason
  )

  plug(:dispatch)

  post "/events" do
    IO.inspect(conn)
    data = conn.body_params()
    IO.puts("events called")
    IO.inspect(data)
    send_resp(conn, 200, "ok")
  end

  post "/upload" do
    IO.inspect(conn)
    data = conn.body_params()
    IO.puts("events called")
    IO.inspect(data)
    send_resp(conn, 200, "ok")
  end

  match _ do
    send_resp(conn, 404, "invalid endpoint")
  end
end
