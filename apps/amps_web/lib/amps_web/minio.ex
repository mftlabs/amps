defmodule AmpsWeb.Minio do
  use GenServer
  require Logger

  # Client
  def start_link(arg) do
    GenServer.start_link(__MODULE__, arg, name: :miniohandler)
  end

  def create_user(pid, access, secret) do
    GenServer.call(pid, {:create_user, {access, secret}})
  end

  def create_policy(pid, policy_name, bucket_name) do
    GenServer.call(pid, {:create_policy, {policy_name, bucket_name}})
  end

  def get_users(pid) do
    GenServer.call(pid, :get_users)
  end

  def attach_policy(pid, access_key, policy_name) do
    GenServer.call(pid, {:attach_policy, {access_key, policy_name}})
  end

  def create_bucket(pid, name, locking \\ false, versioning \\ false) do
    GenServer.call(
      pid,
      {:create_bucket, %{"name" => name, "locking" => locking, "versioning" => versioning}}
    )
  end

  def create_bucket_event(
        pid,
        {bucket_name, %{"arn" => arn, "events" => events, "prefix" => prefix, "suffix" => suffix}}
      ) do
    GenServer.call(
      pid,
      {:create_bucket_event,
       {bucket_name, %{"arn" => arn, "events" => events, "prefix" => prefix, "suffix" => suffix}}}
    )
  end

  def delete_bucket(pid, name) do
    GenServer.call(pid, {:delete_bucket, name})
  end

  def delete_user(pid, access_key) do
    GenServer.call(pid, {:delete_user, access_key})
  end

  def delete_policy(pid, policy) do
    GenServer.call(pid, {:delete_policy, policy})
  end

  # Server
  def init(_) do
    schedule_fetch()
    fetch_token()
  end

  def handle_info(:login, _token) do
    {:ok, token} = fetch_token()
    {:noreply, token}
  end

  def handle_call(params, _from, _token) do
    host = Application.fetch_env!(:amps_web, AmpsWeb.Endpoint)[:minio_addr]
    {:ok, token} = fetch_token()
    headers = [{"Content-type", "application/json"}, {"Cookie", token}]

    case params do
      {:create_user, {access, secret}} ->
        body =
          Jason.encode!(%{
            "accessKey" => access,
            "secretKey" => secret,
            "groups" => [],
            "policies" => []
          })

        {:ok, %HTTPoison.Response{status_code: 201, body: body}} =
          HTTPoison.post(host <> "/api/v1/users", body, headers)

        IO.inspect(body)
        {:reply, {:ok, Jason.decode!(body)}, token}

      {:create_policy, {policy_name, bucket_name}} ->
        policy =
          File.read!(Application.app_dir(:amps_web, "priv/policies/template_policy.json"))
          |> String.replace("{BUCKETNAME}", bucket_name)

        body =
          Jason.encode!(%{
            name: policy_name,
            policy: policy
          })

        {:ok, %HTTPoison.Response{status_code: 201, body: body}} =
          HTTPoison.post(host <> "/api/v1/policies", body, headers)

        IO.inspect(body)
        {:reply, {:ok, Jason.decode!(body)}, token}

      :get_users ->
        {:ok, %HTTPoison.Response{status_code: 200, body: body}} =
          HTTPoison.get(host <> "/api/v1/users", headers)

        IO.inspect(body)
        {:reply, {:ok, Jason.decode!(body)}, token}

      {:attach_policy, {access_key, policy_name}} ->
        options = [params: [name: access_key]]

        {:ok, %HTTPoison.Response{status_code: 200, body: body}} =
          HTTPoison.get(host <> "/api/v1/user", headers, options)

        user = Jason.decode!(body)
        policies = user["policy"]

        policy =
          case policies do
            [""] ->
              ""

            _ ->
              Enum.reduce(policies, "", fn x, acc ->
                acc <> x <> ","
              end)
          end

        policy = policy <> policy_name

        body =
          Jason.encode!(%{"entityName" => access_key, "entityType" => "user", "name" => [policy]})

        {:ok, %HTTPoison.Response{status_code: 204, body: _body}} =
          HTTPoison.put(host <> "/api/v1/set-policy/", body, headers)

        {:reply, {:ok, {policy_name, access_key}}, token}

      {:create_bucket_event, {bucket_name, config}} ->
        body = Jason.encode!(%{"configuration" => config, "ignoreExisting" => true})

        {:ok, %HTTPoison.Response{status_code: 201, body: _body}} =
          HTTPoison.post(
            host <> "/api/v1/buckets/" <> bucket_name <> "/events",
            body,
            headers
          )

        {:reply, {:ok, :success}, token}

      {:create_bucket, config} ->
        body = Jason.encode!(config)

        {:ok, %HTTPoison.Response{status_code: 201, body: _body}} =
          HTTPoison.post(
            host <> "/api/v1/buckets",
            body,
            headers
          )

        {:reply, {:ok, :success}, token}

      {:delete_bucket, bucket_name} ->
        case HTTPoison.delete(
               host <>
                 "/api/v1/buckets/" <>
                 bucket_name <> "/objects?path=%2F&recursive=true",
               headers
             ) do
          {:ok, %HTTPoison.Response{status_code: 200}} ->
            IO.puts(:ok)
        end

        {:ok, %HTTPoison.Response{status_code: 204}} =
          HTTPoison.delete(
            host <> "/api/v1/buckets/" <> bucket_name,
            headers
          )

        {:reply, {:ok, :success}, token}

      {:delete_user, access_key} ->
        options = [params: [name: access_key]]

        {:ok, %HTTPoison.Response{status_code: 204}} =
          HTTPoison.delete(
            host <> "/api/v1/user",
            headers,
            options
          )

        {:reply, {:ok, :success}, token}

      {:delete_policy, policy} ->
        options = [params: [name: policy]]

        {:ok, %HTTPoison.Response{status_code: 204}} =
          HTTPoison.delete(
            host <> "/api/v1/policy",
            headers,
            options
          )

        {:reply, {:ok, :success}, token}
    end
  end

  defp fetch_token() do
    body = Jason.encode!(%{"accessKey" => "minioadmin", "secretKey" => "minioadmin"})
    headers = [{"Content-type", "application/json"}]
    host = Application.fetch_env!(:amps_web, AmpsWeb.Endpoint)[:minio_addr]

    case HTTPoison.post(host <> "/api/v1/login", body, headers) do
      {:ok,
       %HTTPoison.Response{status_code: 201, body: _body, headers: respheaders, request_url: _url}} ->
        {"Set-Cookie", cookie} = List.keyfind(respheaders, "Set-Cookie", 0)

        token = String.split(cookie, ";") |> Enum.at(0)
        IO.puts("Minio Heartbeat Check")
        # IO.inspect(token)
        {:ok, token}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp schedule_fetch() do
    Process.send_after(self(), :login, 100_000)
  end
end
