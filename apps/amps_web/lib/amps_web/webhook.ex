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

  get "/:user/events" do
    IO.inspect(conn)
    user = conn.params["user"]
    IO.puts("events #{user} called")
    send_file(conn, 200, "mix.exs")
  end

  post "/upload" do
    IO.inspect(conn)

    # user = conn.params["user"]
    # IO.inspect(user)
    user = "hello"
    IO.puts("upload to #{user} called")
    data = conn.body_params

    IO.inspect(data)
    send_resp(conn, 200, "Uploaded that ish")
  end

  match _ do
    send_resp(conn, 404, "invalid endpoint")
  end
end
