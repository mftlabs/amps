defmodule AmpsWeb.DataControllerTest do
  use AmpsWeb.ConnCase

  @action %{name: "Action", type: "mailbox"}

  setup %{conn: conn} do
    admin_conn =
      Pow.Plug.assign_current_user(
        conn,
        %AmpsWeb.Users.User{
          email: "test@example.com",
          firstname: "Admin",
          lastname: "User",
          role: "Admin",
          id: 1
        },
        []
      )

    guest_conn =
      Pow.Plug.assign_current_user(
        conn,
        %AmpsWeb.Users.User{
          email: "test@example.com",
          firstname: "Guest",
          lastname: "User",
          role: "Guest",
          id: 2
        },
        []
      )

    {:ok, conn: conn, admin_conn: admin_conn, guest_conn: guest_conn}
  end

  test "get collection", %{admin_conn: admin_conn} do
    conn = get(admin_conn, "/api/services")
    assert %{"count" => count, "rows" => rows, "success" => true} = json_response(conn, 200)
  end

  test "create action as guest", %{guest_conn: guest_conn} do
    conn = post(guest_conn, "/api/actions", @action)
    assert response(conn, 403)
  end

  test "create action as admin", %{admin_conn: admin_conn} do
    conn = post(admin_conn, "/api/actions", @action)
    IO.inspect(conn)

    # DB.find_one("actions", %{"_id" => id})
    assert response(conn, 200)
  end

  # test "add action", %{admin_conn: admin_conn} do
  #   conn = get(admin_conn, "/api/services")
  #   IO.inspect(conn)
  # end
end
