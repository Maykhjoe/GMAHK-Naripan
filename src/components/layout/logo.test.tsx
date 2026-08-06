import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Logo } from "./logo";

afterEach(cleanup);

describe("Logo", () => {
  it("keeps the visible brand text in the home link accessible name", () => {
    render(<Logo />);
    expect(screen.getByRole("link", { name: /^GMAHK NARIPAN BERSAMA DALAM KRISTUS$/i })).toHaveAttribute("href", "/");
  });
});
