defmodule AmpsWeb.DataControllerTest do
  use AmpsWeb.ConnCase
  alias Amps.DB

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
    assert %{"count" => _count, "rows" => _rows, "success" => true} = json_response(conn, 200)
  end

  test "create action as guest", %{guest_conn: guest_conn} do
    conn = post(guest_conn, "/api/actions", @action)
    assert response(conn, 403)
  end

  test "create action as admin", %{admin_conn: admin_conn} do
    conn = post(admin_conn, "/api/actions", @action)
    #IO.inspect(conn)

    # DB.find_one("actions", %{"_id" => id})
    assert response(conn, 200)
  end

  # test "add action", %{admin_conn: admin_conn} do
  #   conn = get(admin_conn, "/api/services")
  #   IO.inspect(conn)
  # end

  # customers
  @create_customer %{
    "active" => true,
    "created" => "2022-02-17T09:11:16.789Z",
    "createdby" => "upendra bonthu",
    "email" => "test@g.com",
    "modified" => "2022-02-17T09:11:16.789Z",
    "modifiedby" => "upendra bonthu",
    "name" => "add_cust_001",
    "phone" => "33333333"
  }

  @update_customer %{
    "active" => true,
    "created" => "2022-02-17T09:11:16.789Z",
    "createdby" => "upendra bonthu",
    "email" => "update@gmail.com",
    "modified" => "2022-02-17T09:11:16.789Z",
    "modifiedby" => "upendra bonthu",
    "name" => "update_cust_001",
    "phone" => "33333333"
  }

  @delete_customer %{
    "active" => true,
    "created" => "2022-02-17T09:11:16.789Z",
    "createdby" => "upendra bonthu",
    "email" => "update@gmail.com",
    "modified" => "2022-02-17T09:11:16.789Z",
    "modifiedby" => "upendra bonthu",
    "name" => "delet_cust_001",
    "phone" => "33333333"
  }


  test "create customer as admin", %{admin_conn: admin_conn} do
    conn = post(admin_conn, "/api/customers", @create_customer)
    cust_obj = DB.find_one("customers", %{"name" => @create_customer["name"]})
    IO.inspect(cust_obj)
    #assert cust_obj["_id"] == response(conn, 200)
    assert response(conn, 200)
  end

  test "create customer as guest", %{guest_conn: guest_conn} do
    conn = post(guest_conn, "/api/customers", @create_customer)
    IO.inspect(conn)
    assert response(conn, 403)
  end

  test "update customer as admin", %{admin_conn: admin_conn} do
    conn = post(admin_conn, "/api/customers", @update_customer)
    assert response(conn, 200)
    cust_obj = DB.find_one("customers", %{"name" => @update_customer["name"]})
    id = cust_obj["_id"]
    conn = put(admin_conn, "/api/customers/#{id}", @update_customer)
    assert response(conn, 200)
  end

  test "update customer as guest", %{guest_conn: guest_conn} do
    conn = post(guest_conn, "/api/customers", @update_customer)
    assert response(conn, 403)
    cust_obj = DB.find_one("customers", %{"name" => @update_customer["name"]})
    id = cust_obj["_id"]
    conn = put(guest_conn, "/api/customers/#{id}" ,@update_customer)
    IO.inspect(conn)
    assert response(conn, 301)
  end


  test "delete customer as guest", %{guest_conn: guest_conn} do
    conn = post(guest_conn, "/api/customers", @delete_customer)
    assert response(conn, 403)
    cust_obj = DB.find_one("customers", %{"name" => @delete_customer["name"]})
    id = cust_obj["_id"]
    conn = delete(guest_conn, "/api/customers/#{id}")
    IO.inspect(conn)
    assert response(conn, 301)
  end

  test "delete customer as admin", %{admin_conn: admin_conn} do
    conn = post(admin_conn, "/api/customers", @delete_customer)
    assert response(conn, 200)
    cust_obj = DB.find_one("customers", %{"name" => @delete_customer["name"]})
    id = cust_obj["_id"]
    conn = delete(admin_conn, "/api/customers/#{id}")
    IO.inspect(conn)
    assert response(conn, 200)
  end


end
