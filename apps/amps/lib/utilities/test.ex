defmodule Fmatch do
  def run(format, msg) do
    {:ok, c} = Regex.compile("\{(.*?)\}")
    rlist = Regex.scan(c, format)
    check(rlist, msg, format)
  end

  defp check([], _msg, fname) do
    fname
  end

  defp check([head | tail], msg, fname) do
    dt = DateTime.utc_now()
    [pat, name] = head

    case name do
      "YYYY" ->
        fname = get_int_val(fname, pat, dt.year, 4)
        check(tail, msg, fname)

      "YY" ->
        str = Integer.to_string(dt.year)
        yy = String.slice(str, 2..3)
        fname = String.replace(fname, pat, yy)
        check(tail, msg, fname)

      "MM" ->
        fname = get_int_val(fname, pat, dt.month, 2)
        check(tail, msg, fname)

      "DD" ->
        fname = get_int_val(fname, pat, dt.day, 2)
        check(tail, msg, fname)

      "HH" ->
        fname = get_int_val(fname, pat, dt.hour, 2)
        check(tail, msg, fname)

      "mm" ->
        fname = get_int_val(fname, pat, dt.minute, 2)
        check(tail, msg, fname)

      "SS" ->
        fname = get_int_val(fname, pat, dt.second, 2)
        check(tail, msg, fname)

      "MS" ->
        {val, num} = dt.microsecond
        strval = val |> Integer.to_string() |> String.pad_leading(num, "0")
        ms = String.slice(strval, 0..2)
        fname = String.replace(fname, pat, ms)
        check(tail, msg, fname)

      _ ->
        rep = msg[name]

        if rep == nil do
          raise "file name cannot be formatted, missing message metadata [#{name}]"
        end

        fname = String.replace(fname, pat, rep)
        check(tail, msg, fname)
    end
  end

  defp get_int_val(fname, pat, val, pad) do
    strval = val |> Integer.to_string() |> String.pad_leading(pad, "0")
    String.replace(fname, pat, strval)
  end
end
