defmodule AmpsWeb.PageControllerTest do
  use AmpsWeb.ConnCase

  #Check api call /api/ampstest
  test "GET /api/ampstest", %{conn: conn} do
    conn = get(conn, "/api/ampstest")
    assert html_response(conn, 200) =~ "Welcome to AMPS!"
  end
end
