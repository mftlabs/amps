defmodule AmpsPortal.PageController do
  use AmpsPortal, :controller

  def index(conn, _params) do
    conn
    |> render("index.html")
  end

  def execute_test(conn, _params) do
    json(conn,  %{"message" => "Welcome to AMPS!"})
  end
end
