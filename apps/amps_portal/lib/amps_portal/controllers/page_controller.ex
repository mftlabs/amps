defmodule AmpsPortal.PageController do
  use AmpsPortal, :controller

  def index(conn, _params) do
    conn
    |> render("index.html")
  end
end
