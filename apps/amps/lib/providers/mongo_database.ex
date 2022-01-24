# defmodule AmpsDatabase do
#   def get_user(user) do
#     Mongo.find_one(:mongo, "user", %{name: user})
#   end

#   def get_action(action) do
#     Mongo.find_one(:mongo, "actions", %{name: action})
#   end

#   defp objectid(id) do
#     {_, idbin} = Base.decode16(id, case: :mixed)
#     %BSON.ObjectId{value: idbin}
#   end

#   def get_action_parms(action_id) do
#     case Mongo.find_one(:mongo, "actions", %{"_id" => objectid(action_id)}) do
#       nil ->
#         nil

#       parms ->
#         Map.delete(parms, "_id")
#     end
#   end

#   def get_itinerary(itname) do
#     Mongo.find_one(:mongo, "itinerary", %{name: itname})
#   end

#   def get_rules(user) do
#     Mongo.find_one(:mongo, "rule", %{name: user})
#   end

#   def get_config(name) do
#     Mongo.find_one(:mongo, "services", %{name: name})
#   end

#   def get_config_filter(filter) do
#     Mongo.find(:mongo, "services", filter) |> Enum.to_list()
#   end
# end

defmodule AmpsDatabase do
  alias Amps.DB

  def get_user(user) do
    DB.find_one("user", %{"name" => user})
  end

  def get_action(action) do
    DB.find_one("actions", %{"name" => action})
  end

  # defp objectid(id) do
  #   {_, idbin} = Base.decode16(id, case: :mixed)
  #   %BSON.ObjectId{value: idbin}
  # end

  def get_action_parms(action_id) do
    case DB.find_one("actions", %{"_id" => action_id}) do
      nil ->
        nil

      parms ->
        Map.delete(parms, "_id")
    end
  end

  def get_itinerary(itname) do
    DB.find_one("itinerary", %{"name" => itname})
  end

  def get_rules(user) do
    DB.find_one("rule", %{"name" => user})
  end

  def get_config(name) do
    DB.find_one("services", %{"name" => name})
  end

  def get_config_filter(filter) do
    DB.find("services", filter)
  end
end
