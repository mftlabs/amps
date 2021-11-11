defmodule AmpsWeb.PageController do
  use AmpsWeb, :controller

  def index(conn, _params) do
    %Timex.TimezoneInfo{full_name: fullname} = Timex.Timezone.local()
    render(conn, "index.html", server_time_zone: fullname)
  end
end
