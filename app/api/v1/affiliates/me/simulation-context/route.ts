import { NextResponse } from "next/server";
import {
  AffiliateContextValidationError,
  mapRemoteContextToAffiliateContext
} from "@/lib/server/affiliate-context-mapper";
import {
  fetchRemoteAffiliateSimulationContext,
  RemoteApiError
} from "@/lib/server/remote-api-client";
import { getAuthSessionFromRequest } from "@/lib/server/session";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const session = getAuthSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      {
        error: "No autenticado",
        code: "SESSION_NOT_FOUND"
      },
      { status: 401 }
    );
  }

  try {
    const remotePayload = await fetchRemoteAffiliateSimulationContext({
      email: session.email
    });

    const context = mapRemoteContextToAffiliateContext(remotePayload, {
      email: session.email
    });

    return NextResponse.json(context, { status: 200 });
  } catch (error) {
    if (error instanceof AffiliateContextValidationError) {
      return NextResponse.json(
        {
          error: error.message,
          code: "SIMULATION_CONTEXT_INVALID",
          details: error.issues
        },
        { status: 422 }
      );
    }

    if (error instanceof RemoteApiError) {
      if (error.status === 404) {
        return NextResponse.json(
          {
            error: "No existe información del afiliado para ese correo en la API remota.",
            code: "SIMULATION_CONTEXT_NOT_FOUND",
            details: error.details
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          error: "No fue posible obtener el contexto remoto del afiliado.",
          code: error.code,
          details: error.details
        },
        { status: 502 }
      );
    }

    const message = error instanceof Error ? error.message : "Error no controlado";
    return NextResponse.json(
      {
        error: "No fue posible obtener el contexto remoto del afiliado.",
        code: "SIMULATION_CONTEXT_FAILURE",
        details: message
      },
      { status: 502 }
    );
  }
}
