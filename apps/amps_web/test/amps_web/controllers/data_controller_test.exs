defmodule AmpsWeb.DataControllerTest do
  use AmpsWeb.ConnCase
  alias Amps.DB

  setup %{conn: conn} do
    admin_conn =
      Pow.Plug.assign_current_user(
        conn,
        %AmpsWeb.Users.User{
          email: "testexample.com",
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
          email: "testexample.com",
          firstname: "Guest",
          lastname: "User",
          role: "Guest",
          id: 2
        },
        []
      )

    {:ok, conn: conn, admin_conn: admin_conn, guest_conn: guest_conn}
  end

  # customers

  Enum.each(
    [
      %{
        "collection" => "customers",
        "obj" => %{
          "active" => true,
          "created" => "2022-02-17T09:11:16.789Z",
          "createdby" => "upendra bonthu",
          "email" => "testg.com",
          "modified" => "2022-02-17T09:11:16.789Z",
          "modifiedby" => "upendra bonthu",
          "name" => "add_cust_001",
          "phone" => "33333333"
        },
        "unique" => "name"
      },
      %{
        "collection" => "users",
        "obj" => %{
          "approved" => true,
          "created" => "2022-02-16T05:21:44.583Z",
          "createdby" => "Abhay Ram",
          "customer" => "Agile Data Inc.",
          "email" => "abhaykram12@gmail.com",
          "firstname" => "Abhay",
          "lastname" => "Ram",
          "modified" => "2022-02-16T05:21:44.583Z",
          "modifiedby" => "Abhay Ram",
          "password" =>
            "$argon2id$v=19$m=131072,t=8,p=4$q9DD/aFZgaOjdOwidyqWsg$Dp6LkOpq7YhWBo6GrEzMr5XCOH2c7PZepOlRRxrC+UI",
          "phone" => "8476121211",
          "rules" => [],
          "ufa" => %{
            "cinterval" => 30,
            "debug" => true,
            "hinterval" => 30,
            "logfile" => "",
            "max" => 100,
            "stime" => "2022-02-16T05:26:55.622Z"
          },
          "username" => "aram0112"
        },
        "unique" => "username"
      }
    ],
    fn config ->
      collection = config["collection"]
      config = Macro.escape(config)
      DB.delete_index(collection)

      test "get #{collection} collection", %{admin_conn: admin_conn} do
        config = unquote(config)
        collection = config["collection"]

        conn = get(admin_conn, Path.join("/api", collection))
        assert %{"count" => _count, "rows" => _rows, "success" => true} = json_response(conn, 200)
      end

      test "create #{collection} as admin", %{admin_conn: admin_conn} do
        config = unquote(config)
        collection = config["collection"]
        obj = config["obj"]
        unique = config["unique"]

        conn = post(admin_conn, Path.join("/api", collection), obj)
        item = DB.find_one(collection, %{unique => obj[unique]})
        assert item["_id"] == json_response(conn, 200)
        DB.delete_one(collection, %{"_id" => item["_id"]})
      end

      test "create #{collection} as guest", %{guest_conn: guest_conn} do
        config = unquote(config)
        collection = config["collection"]
        obj = config["obj"]
        conn = post(guest_conn, Path.join("/api", collection), obj)
        assert response(conn, 403)
      end

      test "update #{collection} as admin", %{admin_conn: admin_conn} do
        config = unquote(config)
        collection = config["collection"]
        obj = config["obj"]
        unique = config["unique"]
        conn = post(admin_conn, Path.join("/api", collection), obj)
        assert response(conn, 200)
        item = DB.find_one(collection, %{unique => obj[unique]})
        id = item["_id"]

        conn =
          put(
            admin_conn,
            Path.join(["/api", collection, id]),
            Map.merge(item, %{name: "updated"})
          )

        assert response(conn, 200)
        DB.delete_one(collection, %{"_id" => id})
      end

      test "update #{collection} as guest", %{guest_conn: guest_conn, admin_conn: admin_conn} do
        config = unquote(config)
        collection = config["collection"]
        obj = config["obj"]
        unique = config["unique"]
        conn = post(admin_conn, Path.join("/api", collection), obj)
        assert response(conn, 200)
        item = DB.find_one(collection, %{unique => obj[unique]})
        id = item["_id"]

        conn =
          put(
            guest_conn,
            Path.join(["/api", collection, id]),
            Map.merge(item, %{name: "updated"})
          )

        assert response(conn, 403)
        DB.delete_one(collection, %{"_id" => id})
      end

      test "delete #{collection} as guest", %{guest_conn: guest_conn, admin_conn: admin_conn} do
        config = unquote(config)
        collection = config["collection"]
        obj = config["obj"]
        unique = config["unique"]
        conn = post(admin_conn, Path.join("/api", collection), obj)
        assert response(conn, 200)
        item = DB.find_one(collection, %{unique => obj[unique]})
        id = item["_id"]
        conn = delete(guest_conn, Path.join(["/api", collection, id]))
        assert response(conn, 403)
        DB.delete_one(collection, %{"_id" => id})
      end

      test "delete #{collection} as admin", %{admin_conn: admin_conn} do
        config = unquote(config)
        collection = config["collection"]
        obj = config["obj"]
        unique = config["unique"]
        conn = post(admin_conn, Path.join("/api", collection), obj)
        assert response(conn, 200)
        item = DB.find_one(collection, %{unique => obj[unique]})
        id = item["_id"]
        conn = delete(admin_conn, Path.join(["/api", collection, id]))
        assert response(conn, 200)
      end
    end
  )
end
