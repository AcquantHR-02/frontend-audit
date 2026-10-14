import { render, screen, within } from "@testing-library/react";
import { setupServer } from "msw/node";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { Provider } from "react-redux";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authApi } from "@/features/auth";
import { handlers } from "@/mocks/handlers";
import { makeStore } from "@/store";
import { VendorsPage } from "./vendors-page";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());

async function renderAs(email: string) {
  const store = makeStore();
  await store.dispatch(authApi.endpoints.login.initiate({ email, password: "Password@123" })).unwrap();
  render(
    <Provider store={store}>
      <NuqsTestingAdapter searchParams="?size=50">
        <VendorsPage />
      </NuqsTestingAdapter>
    </Provider>,
  );
}

describe("<VendorsPage />", () => {
  it("lists vendors from the API with management controls for AUDITOR_ADMIN", async () => {
    await renderAs("admin@acquanthr.test");
    const table = await screen.findByRole("table");
    expect(await within(table).findByText("Bellfast")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add vendor/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /actions for bellfast/i })).toBeInTheDocument();
    expect(screen.getByText(/of 19 vendors/i)).toBeInTheDocument();
  });

  it("is read-only for AUDITOR_USER", async () => {
    await renderAs("auditor@acquanthr.test");
    expect(await screen.findByText("Rathna")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add vendor/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /actions for/i })).not.toBeInTheDocument();
  });
});
