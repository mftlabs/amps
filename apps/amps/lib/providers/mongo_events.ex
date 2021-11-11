# defmodule AmpsEvents do
#   def message(msg) do
#     IO.puts("event: message - #{inspect(msg)}")
#     Mongo.insert_one(:mongo, "message", msg)
#   end

#   def session_start(session) do
#     data =
#       Map.merge(session, %{
#         "status" => "started",
#         "stime" => AmpsUtil.gettime()
#       })

#     IO.puts("event: #{inspect(data)}")
#     Mongo.insert_one(:mongo, "session", data)
#   end

#   def session_end(session_id, status, text \\ "") do
#     IO.puts("event: session end / #{status} #{text}")

#     Mongo.update_one(:mongo, "session", %{"session_id" => session_id}, %{
#       "$set": %{"status" => status, "etime" => AmpsUtil.gettime(), "reason" => text}
#     })
#   end

#   def session_info(source, session_id, session) do
#     data =
#       Map.merge(session, %{
#         "session" => session_id,
#         "source" => source,
#         "status" => "info",
#         "time" => AmpsUtil.gettime()
#       })

#     Mongo.insert_one(:mongo, "session_details", data)
#     IO.puts("event: #{inspect(data)}")
#   end

#   def session_debug(source, session_id, session) do
#     data =
#       Map.merge(session, %{
#         "session" => session_id,
#         "source" => source,
#         "status" => "debug",
#         "time" => AmpsUtil.gettime()
#       })

#     IO.puts("event: #{inspect(data)}")
#   end

#   def session_warning(source, session_id, session) do
#     data =
#       Map.merge(session, %{
#         "session" => session_id,
#         "source" => source,
#         "status" => "warning",
#         "time" => AmpsUtil.gettime()
#       })

#     IO.puts("event: #{inspect(data)}")
#   end
# end
