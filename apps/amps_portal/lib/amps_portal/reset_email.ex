defmodule AmpsPortal.UserEmail do
  import Swoosh.Email

  def reset(user, link) do
    fullname = user.firstname <> " " <> user.lastname

    new()
    |> to({fullname, user.email})
    |> from({"AMPS", "AMPS@noreply.com"})
    |> subject("Password Reset Link")
    |> html_body(
      "<h1>Hello #{fullname}</h1><h2>Please follow the link below to reset your password</h2><a target=\"_blank\" href=\"#{link}\">Reset my password</a>"
    )
  end
end
