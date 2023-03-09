defmodule Progress do
  @rounding_precision 2
  @progress_bar_size 50
  @complete_character "█"
  @incomplete_character "░"

  def bar(count, total) do
    percent = percent_complete(count, total)
    divisor = 100 / @progress_bar_size

    complete_count = round(percent / divisor)
    incomplete_count = @progress_bar_size - complete_count

    complete = String.duplicate(@complete_character, complete_count)
    incomplete = String.duplicate(@incomplete_character, incomplete_count)

    "#{complete}#{incomplete}  (#{percent}%)"
  end

  defp percent_complete(count, total) do
    Float.round(100.0 * count / total, @rounding_precision)
  end
end
