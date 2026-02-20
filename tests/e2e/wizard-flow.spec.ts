import { expect, test } from "@playwright/test";

test("flujo afiliado final con OTP, simulación y logout", async ({ page }) => {
  let authenticated = false;

  await page.route("**/api/v1/auth/challenges", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        challengeId: "challenge-test-001",
        expiresInSeconds: 600,
        resendAvailableInSeconds: 60
      })
    });
  });

  await page.route("**/api/v1/auth/sessions", async (route) => {
    const method = route.request().method();

    if (method === "GET") {
      if (authenticated) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            authenticated: true,
            email: "afiliado@test.com"
          })
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          authenticated: false
        })
      });
      return;
    }

    if (method === "POST") {
      authenticated = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ authenticated: true })
      });
      return;
    }

    authenticated = false;
    await route.fulfill({
      status: 204,
      body: ""
    });
  });

  await page.route("**/api/v1/affiliates/me/simulation-context", async (route) => {
    if (!authenticated) {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "No autenticado" })
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        affiliate: {
          email: "afiliado@test.com",
          fullName: "Alicia Moreno"
        },
        calculationDate: "2026-02-19",
        accountBalance: 3481733.27,
        funds: {
          mandatory: 3000000,
          voluntary: 481733.27,
          total: 3481733.27
        },
        bov: 200832.23,
        mandatoryContribution: {
          startAge: 58,
          endAgeDefault: 65
        },
        voluntaryContribution: {
          startAge: 58,
          endAgeDefault: 65
        },
        beneficiaries: [
          {
            fullName: "Alicia Moreno",
            type: "T",
            sex: 1,
            birthDate: "1966-05-19",
            invalid: 0
          },
          {
            fullName: "Carolina Moreno",
            type: "C",
            sex: 2,
            birthDate: "1972-04-07",
            invalid: 0
          }
        ]
      })
    });
  });

  await page.route("**/api/v1/simulations/run", async (route) => {
    const payload = route.request().postDataJSON() as {
      voluntaryContribution: {
        monthlyAmount: number;
      };
    };

    const monthlyAmount = payload.voluntaryContribution.monthlyAmount;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ppuu: 180.7791975865581,
        projectedBenefit: 35267.44764948587 + monthlyAmount / 10,
        finalBalance: 6375620.886987179 + monthlyAmount,
        retirementDate: "2031-05-19",
        counts: {
          n: 2,
          spouses: 1,
          children: 0
        },
        agesInMonths: [780, 709],
        trace: {
          xmin: 187,
          tMax: 1145,
          warnings: []
        }
      })
    });
  });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: /ingreso de afiliado/i })).toBeVisible();

  await page.getByLabel(/correo electrónico/i).fill("afiliado@test.com");
  await page.getByRole("button", { name: /enviar código/i }).click();

  await expect(page.getByRole("heading", { name: /verificación otp/i })).toBeVisible();
  await page.getByLabel(/código de verificación/i).fill("123456");
  await page.getByRole("button", { name: /^ingresar$/i }).click();

  await expect(page.getByText(/total acumulado/i)).toBeVisible();
  await expect(page.getByText(/afiliado en sesión activa/i)).toBeVisible();
  await expect(page.locator(".af-toolbar-copy strong")).toHaveText("Alicia Moreno");

  await page.getByLabel(/aporte voluntario mensual/i).fill("15000");
  await page.getByRole("button", { name: /^calcular/i }).click();

  await expect(page.getByText(/haber mensual proyectado/i)).toBeVisible();
  await expect(page.getByText(/evolución what-if/i)).toBeVisible();

  await page.getByRole("button", { name: /cerrar sesión/i }).click();

  await expect(page.getByRole("heading", { name: /ingreso de afiliado/i })).toBeVisible();
});
