defmodule Amps.Multipart do
  @multipart Plug.Parsers.MULTIPART

  def init(opts) do
    opts
  end

  def parse(conn, "multipart", subtype, headers, opts) do
    IO.inspect(conn)
    limit = [limit: 1_099_511_627_776]
    opts = @multipart.init([limit: limit] ++ opts)
    @multipart.parse(conn, "multipart", subtype, headers, opts)
  end

  def parse(conn, _type, _subtype, _headers, _opts) do
    {:next, conn}
  end
end
