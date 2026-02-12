import { expect, test } from "@playwright/test";

test("ejecuta el wizard y muestra resultados", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /simulador previsional/i
    })
  ).toBeVisible();

  await page.getByRole("button", { name: /5\. resultados/i }).click();
  await page.getByRole("button", { name: /ejecutar simulación/i }).click();

  await expect(page.getByText(/PPUU/i)).toBeVisible();
  await expect(page.getByText(/Saldo Final/i)).toBeVisible();
  await expect(page.getByText(/Beneficio Proyectado/i)).toBeVisible();
});
