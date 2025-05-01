defmodule AmpsPortal.UserEmail do
  import Swoosh.Email

  def reset(user, link, _host) do
    fullname = user.firstname <> " " <> user.lastname

  #  logo_data =
  #    "data:image/png;base64," <>
  #      Base.encode64(File.read!(Path.join([:code.priv_dir(:amps_web), "static/images", "logo"])))

    # logo = "data:image/png;base64,#{logo_data}"

    # logo =
    html =
      EEx.eval_file(
        Path.join([:code.priv_dir(:amps_portal), "templates", "email", "reset_password.eex"]),
        logo: "cid:logo.png",
        link: link
      )

    new()
    |> to({fullname, user.email})
    |> from({"AMPS", "AMPS@noreply.com"})
    |> subject("AMPS Password Reset Request")
    |> html_body(html)
    |> attachment(
      Swoosh.Attachment.new(
        Path.join([:code.priv_dir(:amps_web), "static/images", "logo"]),
        filename: "logo.png",
        content_type: "image/png",
        type: :inline,
        cid: "logo.png"
      )
    )
  end
end
