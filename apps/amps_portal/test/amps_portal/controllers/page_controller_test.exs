defmodule AmpsPortal.PageControllerTest do
  use AmpsPortal.ConnCase

  test "GET /api/ampstest", %{conn: conn} do
    conn = get(conn, "/api/ampstest")
    assert json_response(conn, 200) == %{"message" => "Welcome to AMPS!"}
  end
end
