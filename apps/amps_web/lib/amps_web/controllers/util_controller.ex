defmodule AmpsWeb.UtilController do
  use AmpsWeb, :controller

  def glob_match(conn, _params) do
    body = conn.body_params()
    test = body["test"]
    pattern = body["pattern"]

    is_match =
      if :glob.matches(test, pattern) do
        IO.puts("matched #{test} and #{pattern}")
        true
      else
        IO.puts("doesn't match")
        false
      end

    json(conn, is_match)
  end
end
