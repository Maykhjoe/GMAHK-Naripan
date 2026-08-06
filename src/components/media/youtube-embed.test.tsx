import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { YouTubeEmbed } from "./youtube-embed";

afterEach(cleanup);

describe("YouTubeEmbed facade", () => {
  it("does not load the iframe before the visitor chooses to play", () => {
    render(<YouTubeEmbed id="ysz5S6PUM-U" title="Khotbah Uji" />);
    expect(screen.queryByTitle("Khotbah Uji")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Putar video Khotbah Uji" })).toBeInTheDocument();
    expect(screen.getByAltText("Pratinjau video Khotbah Uji")).toBeInTheDocument();
  });

  it("loads a privacy-enhanced autoplay iframe after activation", () => {
    render(<YouTubeEmbed id="ysz5S6PUM-U" title="Khotbah Uji" />);
    fireEvent.click(screen.getByRole("button", { name: "Putar video Khotbah Uji" }));
    const iframe = screen.getByTitle("Khotbah Uji");
    expect(iframe).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/ysz5S6PUM-U?autoplay=1&rel=0");
    expect(screen.queryByRole("button", { name: "Putar video Khotbah Uji" })).not.toBeInTheDocument();
  });
});
