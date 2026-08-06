import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JsonLd } from "./json-ld";

describe("JsonLd", () => {
  it("renders safe application/ld+json content", () => {
    const { container } = render(<JsonLd data={{ name: "Gereja </script> Naripan" }} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    expect(script?.textContent).toContain("Gereja \\u003c/script\\u003e Naripan");
    expect(script?.textContent).not.toContain("</script>");
  });
});
