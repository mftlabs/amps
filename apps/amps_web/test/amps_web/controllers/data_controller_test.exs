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
      },
      %{
        "collection" => "providers",
        "obj" => %{
          "created" => "2022-02-18T06=>50=>56.802Z",
          "createdby" => "Bindu Rani",
          "desc" => "test",
          "key" => "sdyhjhjdsdsd",
          "modified" => "2022-02-18T06=>50=>56.802Z",
          "modifiedby" => "Bindu Rani",
          "name" => "DeliverViaS3",
          "provider" => "AWS",
          "proxy" => true,
          "proxy_password" => "test@123",
          "proxy_url" => "https://test.com",
          "proxy_username" => "admin",
          "region" => "ap-south-1",
          "secret" => "password",
          "type" => "s3"
        },
        "unique" => "name"
      },
      %{
        "collection" => "actions",
        "obj" => %{
          "active" => true,
          "created" => "2022-02-17T07:32:30.042Z",
          "createdby" => "Bindu Rani",
          "desc" => "testrun",
          "format" => "*",
          "modified" => "2022-02-17T07:32:30.042Z",
          "modifiedby" => "Bindu Rani",
          "module" => "test",
          "name" => "CreateTMUser",
          "output" => "amps.actions.zip.Test",
          "parms" => %{
            "action" => "add"
          },
          "script_type" => "python",
          "send_output" => true,
          "type" => "runscript"
        },
        "unique" => "name"
      },
      %{
        "collection" => "fields",
        "obj" => %{
          "created" => "2022-02-18T10:08:05.133Z",
          "createdby" => "Bindu Rani",
          "desc" => "test",
          "field" => "Test",
          "modified" => "2022-02-18T10:08:05.133Z",
          "modifiedby" => "Bindu Rani"
        },
        "unique" => "field"
      },
      %{
        "collection" => "admin",
        "obj" => %{
          "created" => "2022-02-18T10:08:05.133Z",
          "createdby" => "upendra bonthu",
          "email" => "testuser@gmail.com",
          "username" => "TestUserAdmin001",
          "firstname" => "First Name",
          "lastname" => "Last Name",
          "password" => "Test@123",
          "phone" => "9999999999",
          "modified" => "2022-02-18T10:08:05.133Z",
          "modifiedby" => "upendra bonthu"
        },
        "unique" => "username"
        },
     %{
        "collection" => "rules",
        "obj" => %{
        "created" => "2022-02-18T10:01:39.685Z",
        "createdby" => "Bindu Rani",
        "desc" => "add rule",
        "modified" => "2022-02-18T10:01:39.685Z",
        "modifiedby" => "Bindu Rani",
        "name" => "testrule",
        "output" => "amps.actions.zip.Test",
        "patterns" => %{
          "test" => %{
            "regex" => false,
            "value" => "*"
          }
        }
        },
        "unique" => "name"
      },
      #%{
      #  "collection" => "scheduler",
      #  "obj" => %{
      #    "active" => true,
      #    "created" => "2022-02-21T04:55:43.026Z",
      #    "createdby" => "Bindu Rani",
      #    "meta" => %{ },
      #    "modified" => "2022-02-21T04:55:43.027Z",
      #    "modifiedby" => "Bindu Rani",
      #    "name" => "RunBasedOnTimer",
      #    "topic" => "amps.actions.zip.Test",
      #    "type" => "timer",
      #    "unit" => "Minutes",
      #    "value" => "1"
      #  },
      #  "unique" => "name"
      #}
      %{
        "collection" => "topics",
        "obj" => %{
          "created" => "2022-02-17T11:18:49.037Z",
          "createdby" => "Bindu Rani",
          "desc" => "test",
          "modified" => "2022-02-17T11:18:49.037Z",
          "modifiedby" => "Bindu Rani",
          "topic" => "amps.data.test",
          "type" => "data"
        },
        "unique" => "topic"
      },
    ],
    fn config ->
      collection = config["collection"]
      config = Macro.escape(config)
      DB.delete_index(collection)

      cond do
        collection == "admin" ->
          IO.inspect({"Admin Users Test Cases"})
          test "get #{collection} collection", %{admin_conn: admin_conn} do
            config = unquote(config)
            collection = config["collection"]

            conn = get(admin_conn, Path.join("/api", collection))
            assert %{"count" => _count, "rows" => _rows, "success" => true} = json_response(conn, 200)
          end

          test "create-register #{collection} as admin", %{admin_conn: admin_conn} do
            config = unquote(config)
            collection = config["collection"]
            obj = config["obj"]
            unique = config["unique"]

            conn = post(admin_conn, Path.join(["/api", "user","reg"]), obj)
            item = DB.find_one(collection, %{unique => obj[unique]})
            assert response(conn, 200)
            DB.delete_one(collection, %{"_id" => item["_id"]})
          end

          test "update admin users as admin", %{admin_conn: admin_conn} do
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
                Map.merge(item, %{approved: true})
              )

            assert response(conn, 200)
            DB.delete_one(collection, %{"_id" => id})
          end

          test "update admin users as guest", %{guest_conn: guest_conn, admin_conn: admin_conn} do
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
                Map.merge(item, %{approved: true})
              )

            assert response(conn, 403)
            DB.delete_one(collection, %{"_id" => id})
          end

          test "Reset admin users password", %{admin_conn: admin_conn} do
            config = unquote(config)
            collection = config["collection"]
            obj = config["obj"]
            unique = config["unique"]
            conn = post(admin_conn, Path.join(["/api", "user","reg"]), obj)
            assert response(conn, 200)
            item = DB.find_one(collection, %{unique => obj[unique]})
            IO.inspect(item)
            id = item["_id"]
            conn = get(admin_conn, Path.join(["/api", collection,"reset/#{id}"]))
            assert response(conn, 200)
            DB.delete_one(collection, %{"_id" => id})
          end

          # test "Change admin users password", %{admin_conn: admin_conn} do
          #   config = unquote(config)
          #   collection = config["collection"]
          #   obj = config["obj"]
          #   unique = config["unique"]
          #   IO.inspect(obj)
          #   IO.inspect(unique)
          #   conn = post(admin_conn, Path.join(["/api", "user","reg"]), obj)
          #   assert response(conn, 200)
          #   item = DB.find_one(collection, %{unique => obj[unique]})
          #   IO.inspect(item)
          #   id = item["_id"]
          #   IO.inspect("Reset Password id is")
          #   IO.inspect(id)
          #   IO.inspect(Path.join(["/api", collection,"changepassword/#{id}"])
          #   conn = post(admin_conn, Path.join(["/api", collection,"changepassword/#{id}"]), %{"password" => "Test@1234"})
          #   assert response(conn, 200)
          # end



        true ->
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

                test "create #{collection} with ID as admin", %{admin_conn: admin_conn} do
                  config = unquote(config)
                  collection = config["collection"]
                  obj = config["obj"]
                  unique = config["unique"]
                  id = "wYG7CH8BgM9CNIGhbIzh"
                    conn =
                      post(
                        admin_conn,
                        Path.join(["/api", collection, id]),
                        obj
                      )
                  item = DB.find_one(collection, %{unique => obj[unique]})
                  assert item["_id"] == json_response(conn, 200)
                  DB.delete_one(collection, %{"_id" => item["_id"]})
                end

                test "create #{collection} with ID as guest", %{guest_conn: guest_conn} do
                  config = unquote(config)
                  collection = config["collection"]
                  obj = config["obj"]
                  unique = config["unique"]
                  id = "wYG7CH8BgM9CNIGhbIzh"
                  conn =
                    post(
                      guest_conn,
                      Path.join(["/api", collection, id]),
                      obj
                    )
                    item = DB.find_one(collection, %{unique => obj[unique]})
                    assert item["_id"] == json_response(conn, 200)
                    DB.delete_one(collection, %{"_id" => item["_id"]})
                end

                test "get #{collection} field value with (id & field key) as admin", %{admin_conn: admin_conn} do
                  config = unquote(config)
                  collection = config["collection"]
                  obj = config["obj"]
                  unique = config["unique"]
                  conn = post(admin_conn, Path.join("/api", collection), obj)
                  assert response(conn, 200)
                  item = DB.find_one(collection, %{unique => obj[unique]})
                  id = item["_id"]
                  Enum.each item, fn {k, _v} ->
                    conn =
                      get(
                        admin_conn,
                        Path.join(["/api", collection, id,k])            )
                    assert response(conn, 200)
                  end
                  DB.delete_one(collection, %{"_id" => item["_id"]})
                end



                test "update #{collection} field value with (id & field key) as admin", %{admin_conn: admin_conn} do
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
                      Path.join(["/api", collection, id,"modifiedby"]),Map.merge(obj, %{modifiedby: "updated user"})
                    )
                  assert response(conn, 200)
                  item = DB.find_one(collection, %{unique => obj[unique]})
                  DB.delete_one(collection, %{"_id" => item["_id"]})
                end

                if collection == "users" do
                    test "create rule in users as admin", %{admin_conn: admin_conn} do
                      config = unquote(config)
                      collection = config["collection"]
                      obj = config["obj"]
                      unique = config["unique"]
                      conn = post(admin_conn, Path.join("/api", collection), obj)
                      item = DB.find_one(collection, %{unique => obj[unique]})
                      assert item["_id"] == json_response(conn, 200)
                      id = item["_id"]
                      conn =
                        post(
                          admin_conn,
                          Path.join(["/api", collection, id,"rules"]),
                          %{
                            "ackmode" => "archive",
                            "active" => true,
                            "created" => "2022-02-03T09:56:55.844Z",
                            "createdby" => "upendra bonthu",
                            "fmatch" => "vfcds",
                            "format" => "fdfc",
                            "fpoll" => "300",
                            "fretry" => "5",
                            "modified" => "2022-02-03T09:56:55.844Z",
                            "modifiedby" => "upendra bonthu",
                            "name" => "vfdsfd",
                            "regex" => false,
                            "type" => "upload"
                          }
                        )
                      assert response(conn, 200)
                      item = DB.find_one(collection, %{unique => obj[unique]})
                      assert json_response(conn, 200)
                      DB.delete_one(collection, %{"_id" => item["_id"]})
                    end


                    test "create rule in users as guest", %{admin_conn: admin_conn,guest_conn: guest_conn,} do
                      config = unquote(config)
                      collection = config["collection"]
                      obj = config["obj"]
                      unique = config["unique"]
                      conn = post(admin_conn, Path.join("/api", collection), obj)
                      item = DB.find_one(collection, %{unique => obj[unique]})
                      assert item["_id"] == json_response(conn, 200)
                      id = item["_id"]
                      conn =
                        post(
                          guest_conn,
                          Path.join(["/api", collection, id,"rules"]),
                          %{
                            "ackmode" => "archive",
                            "active" => true,
                            "created" => "2022-02-03T09:56:55.844Z",
                            "createdby" => "upendra bonthu",
                            "fmatch" => "vfcds",
                            "format" => "fdfc",
                            "fpoll" => "300",
                            "fretry" => "5",
                            "modified" => "2022-02-03T09:56:55.844Z",
                            "modifiedby" => "upendra bonthu",
                            "name" => "vfdsfd",
                            "regex" => false,
                            "type" => "upload"
                          }
                        )
                      assert response(conn, 403)
                      item = DB.find_one(collection, %{unique => obj[unique]})
                      DB.delete_one(collection, %{"_id" => item["_id"]})
                    end


                    test "get rules object (user id & rule id ) as admin", %{admin_conn: admin_conn} do
                      config = unquote(config)
                      collection = config["collection"]
                      obj = config["obj"]
                      unique = config["unique"]
                      conn = post(admin_conn, Path.join("/api", collection), obj)
                      item = DB.find_one(collection, %{unique => obj[unique]})
                      assert item["_id"] == json_response(conn, 200)
                      id = item["_id"]
                      conn =
                        post(
                          admin_conn,
                          Path.join(["/api", collection, id,"rules"]),
                          %{
                            "ackmode" => "archive",
                            "active" => true,
                            "created" => "2022-02-03T09:56:55.844Z",
                            "createdby" => "upendra bonthu",
                            "fmatch" => "vfcds",
                            "format" => "fdfc",
                            "fpoll" => "300",
                            "fretry" => "5",
                            "modified" => "2022-02-03T09:56:55.844Z",
                            "modifiedby" => "upendra bonthu",
                            "name" => "test_upload",
                            "regex" => false,
                            "type" => "upload"
                          }
                        )
                      #assert response(conn, 200)
                      res =  json_response(conn, 200)
                      for n <- res["rules"] do
                        IO.inspect(n)
                        if n["name"] == "test_upload" do
                          IO.inspect("Feaching Rule for test_upload")
                          conn = get(admin_conn,Path.join(["/api", collection, id,"rules",n["_id"]]))
                          assert json_response(conn, 200)
                        end
                      end
                      item = DB.find_one(collection, %{unique => obj[unique]})
                      assert json_response(conn, 200)
                      DB.delete_one(collection, %{"_id" => item["_id"]})
                    end

                    test "update rules object (user id & rule id ) as admin", %{admin_conn: admin_conn} do
                      config = unquote(config)
                      collection = config["collection"]
                      obj = config["obj"]
                      unique = config["unique"]
                      conn = post(admin_conn, Path.join("/api", collection), obj)
                      item = DB.find_one(collection, %{unique => obj[unique]})
                      assert item["_id"] == json_response(conn, 200)
                      id = item["_id"]
                      conn =
                        post(
                          admin_conn,
                          Path.join(["/api", collection, id,"rules"]),
                          %{
                            "ackmode" => "archive",
                            "active" => true,
                            "created" => "2022-02-03T09:56:55.844Z",
                            "createdby" => "upendra bonthu",
                            "fmatch" => "vfcds",
                            "format" => "fdfc",
                            "fpoll" => "300",
                            "fretry" => "5",
                            "modified" => "2022-02-03T09:56:55.844Z",
                            "modifiedby" => "upendra bonthu",
                            "name" => "test_upload",
                            "regex" => false,
                            "type" => "upload"
                          }
                        )
                      res =  json_response(conn, 200)
                      for n <- res["rules"] do
                        IO.inspect(n)
                        if n["name"] == "test_upload" do
                          IO.inspect("Feaching Rule for test_upload to update")
                          conn = put(admin_conn,Path.join(["/api", collection, id,"rules",n["_id"]]),
                          Map.merge(n, %{fmatch: "updated_fmatch",format: "updated_format"})
                          )
                          assert json_response(conn, 200)
                        end
                      end
                      item = DB.find_one(collection, %{unique => obj[unique]})
                      assert json_response(conn, 200)
                      DB.delete_one(collection, %{"_id" => item["_id"]})
                    end


                    test "delete rules object (user id & rule id ) as admin", %{admin_conn: admin_conn} do
                      config = unquote(config)
                      collection = config["collection"]
                      obj = config["obj"]
                      unique = config["unique"]
                      conn = post(admin_conn, Path.join("/api", collection), obj)
                      item = DB.find_one(collection, %{unique => obj[unique]})
                      assert item["_id"] == json_response(conn, 200)
                      id = item["_id"]
                      conn =
                        post(
                          admin_conn,
                          Path.join(["/api", collection, id,"rules"]),
                          %{
                            "ackmode" => "archive",
                            "active" => true,
                            "created" => "2022-02-03T09:56:55.844Z",
                            "createdby" => "upendra bonthu",
                            "fmatch" => "vfcds",
                            "format" => "fdfc",
                            "fpoll" => "300",
                            "fretry" => "5",
                            "modified" => "2022-02-03T09:56:55.844Z",
                            "modifiedby" => "upendra bonthu",
                            "name" => "test_upload",
                            "regex" => false,
                            "type" => "upload"
                          }
                        )
                      res =  json_response(conn, 200)
                      for n <- res["rules"] do
                        IO.inspect(n)
                        if n["name"] == "test_upload" do
                          IO.inspect("Feaching Rule for test_upload to delete")
                          conn = delete(admin_conn,Path.join(["/api", collection, id,"rules",n["_id"]]),
                          Map.merge(n, %{fmatch: "updated_fmatch",format: "updated_format"})
                          )
                          assert json_response(conn, 200)
                        end
                      end
                      item = DB.find_one(collection, %{unique => obj[unique]})
                      assert json_response(conn, 200)
                      DB.delete_one(collection, %{"_id" => item["_id"]})
                    end


                    test "delete rules object (user id & rule id ) as guest", %{guest_conn: guest_conn, admin_conn: admin_conn} do
                      config = unquote(config)
                      collection = config["collection"]
                      obj = config["obj"]
                      unique = config["unique"]
                      conn = post(admin_conn, Path.join("/api", collection), obj)
                      item = DB.find_one(collection, %{unique => obj[unique]})
                      assert item["_id"] == json_response(conn, 200)
                      id = item["_id"]
                      conn =
                        post(
                          admin_conn,
                          Path.join(["/api", collection, id,"rules"]),
                          %{
                            "ackmode" => "archive",
                            "active" => true,
                            "created" => "2022-02-03T09:56:55.844Z",
                            "createdby" => "upendra bonthu",
                            "fmatch" => "vfcds",
                            "format" => "fdfc",
                            "fpoll" => "300",
                            "fretry" => "5",
                            "modified" => "2022-02-03T09:56:55.844Z",
                            "modifiedby" => "upendra bonthu",
                            "name" => "test_upload",
                            "regex" => false,
                            "type" => "upload"
                          }
                        )
                      res =  json_response(conn, 200)
                      for n <- res["rules"] do
                        IO.inspect(n)
                        if n["name"] == "test_upload" do
                          IO.inspect("Feaching Rule for test_upload to delete")
                          conn = delete(guest_conn,Path.join(["/api", collection, id,"rules",n["_id"]])
                          )
                          assert response(conn, 403)
                        end
                      end
                      item = DB.find_one(collection, %{unique => obj[unique]})
                      assert json_response(conn, 200)
                      DB.delete_one(collection, %{"_id" => item["_id"]})
                    end


                    test "update ufa object (user id & ufa key name ) as admin", %{admin_conn: admin_conn} do
                      config = unquote(config)
                      collection = config["collection"]
                      obj = config["obj"]
                      unique = config["unique"]
                      conn = post(admin_conn, Path.join("/api", collection), obj)
                      item = DB.find_one(collection, %{unique => obj[unique]})
                      assert item["_id"] == json_response(conn, 200)
                      id = item["_id"]
                      conn =
                        put(
                          admin_conn,
                          Path.join(["/api", collection, id,"ufa"]),
                          %{
                            "cinterval" => 30,
                            "debug" => false,
                            "hinterval" => 30,
                            "logfile" => "Info",
                            "max" => 100,
                            "stime" => "2022-02-21T08:53:13.370Z"
                          }
                        )
                      item = DB.find_one(collection, %{unique => obj[unique]})
                      assert json_response(conn, 200)
                      DB.delete_one(collection, %{"_id" => item["_id"]})
                    end


                    test "update ufa object (user id & ufa key name) as admin", %{admin_conn: admin_conn} do
                      config = unquote(config)
                      collection = config["collection"]
                      obj = config["obj"]
                      unique = config["unique"]
                      conn = post(admin_conn, Path.join("/api", collection), obj)
                      item = DB.find_one(collection, %{unique => obj[unique]})
                      assert item["_id"] == json_response(conn, 200)
                      id = item["_id"]
                      conn =
                        put(
                          admin_conn,
                          Path.join(["/api", collection, id,"ufa"]),
                          %{
                            "cinterval" => 30,
                            "debug" => false,
                            "hinterval" => 30,
                            "logfile" => "Info",
                            "max" => 100,
                            "stime" => "2022-02-21T08:53:13.370Z"
                          }
                        )
                      item = DB.find_one(collection, %{unique => obj[unique]})
                      assert json_response(conn, 200)
                      DB.delete_one(collection, %{"_id" => item["_id"]})
                    end

                    test "update ufa object (user id & ufa key name) as  guest", %{guest_conn: guest_conn, admin_conn: admin_conn} do
                      config = unquote(config)
                      collection = config["collection"]
                      obj = config["obj"]
                      unique = config["unique"]
                      conn = post(admin_conn, Path.join("/api", collection), obj)
                      item = DB.find_one(collection, %{unique => obj[unique]})
                      assert item["_id"] == json_response(conn, 200)
                      id = item["_id"]
                      conn =
                        put(
                          guest_conn,
                          Path.join(["/api", collection, id,"ufa"]),
                          %{
                            "cinterval" => 30,
                            "debug" => false,
                            "hinterval" => 30,
                            "logfile" => "Info",
                            "max" => 100,
                            "stime" => "2022-02-21T08:53:13.370Z"
                          }
                        )
                      item = DB.find_one(collection, %{unique => obj[unique]})
                      assert response(conn, 200)
                      DB.delete_one(collection, %{"_id" => item["_id"]})
                    end


                end

              end
      end

  )
end
