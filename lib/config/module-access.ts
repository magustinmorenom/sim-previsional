import type { ModuleDescriptor, ModuleVisibility } from "@/lib/types/content";

const BASE_MODULES: ModuleDescriptor[] = [
  {
    key: "home",
    title: "Inicio",
    description: "Resumen y accesos rápidos de la app anexa.",
    path: "/app",
    visibility: "public",
    enabled: true
  },
  {
    key: "biblioteca",
    title: "Biblioteca",
    description: "Documentos, formularios y archivos operativos en un solo lugar.",
    path: "/app/biblioteca",
    visibility: "public",
    enabled: true
  },
  {
    key: "procesos",
    title: "Procesos",
    description: "Guías paso a paso y checklists por trámite.",
    path: "/app/procesos",
    visibility: "public",
    enabled: true
  },
  {
    key: "faq",
    title: "FAQ",
    description: "Preguntas frecuentes organizadas por tema.",
    path: "/app/faq",
    visibility: "public",
    enabled: false
  },
  {
    key: "repositorio-normativo",
    title: "Normativa",
    description: "Ley, reglamentos y resoluciones de consulta.",
    path: "/app/repositorio-normativo",
    visibility: "public",
    enabled: false,
    badge: "Normativo"
  },
  {
    key: "consultas",
    title: "Consultas",
    description: "Canales de contacto y derivación.",
    path: "/app/consultas",
    visibility: "public",
    enabled: true
  },
  {
    key: "tramites",
    title: "Trámites",
    description: "Generación de BEP para aportes a través de Comunidad Vinculada - Personería Jurídica.",
    path: "/app/tramites",
    visibility: "private",
    enabled: true
  },
  {
    key: "chatbot-cps",
    title: "Chatbot CPS",
    description: "Asistente documental con búsqueda sobre normativa y procesos.",
    path: "/app/chatbot",
    visibility: "public",
    enabled: false,
    badge: "IA"
  },
  {
    key: "simulador-previsional",
    title: "Simulador previsional",
    description: "Proyección previsional personalizada del afiliado.",
    path: "/app/simuladores/previsional",
    visibility: "private",
    enabled: true
  },
  {
    key: "simulador-prestamos",
    title: "Simulador préstamos",
    description: "Subapp de préstamos reservada para la próxima etapa.",
    path: "/app/simuladores/prestamos",
    visibility: "private",
    enabled: true
  },
  {
    key: "acceso",
    title: "Acceso",
    description: "Ingreso con código de un solo uso para secciones privadas.",
    path: "/app/acceso",
    visibility: "public",
    enabled: false
  }
];

function parseCsvSet(value: string | undefined): Set<string> {
  if (!value) {
    return new Set<string>();
  }

  return new Set(
    value
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
}

function resolveVisibility(
  descriptor: ModuleDescriptor,
  privateModules: Set<string>,
  publicModules: Set<string>
): ModuleVisibility {
  if (privateModules.has(descriptor.key.toLowerCase())) {
    return "private";
  }

  if (publicModules.has(descriptor.key.toLowerCase())) {
    return "public";
  }

  return descriptor.visibility;
}

function buildModuleMatrix(): ModuleDescriptor[] {
  const privateModules = parseCsvSet(process.env.APP_PRIVATE_MODULES);
  const publicModules = parseCsvSet(process.env.APP_PUBLIC_MODULES);
  const disabledModules = parseCsvSet(process.env.APP_DISABLED_MODULES);

  return BASE_MODULES.map((descriptor) => {
    const enabled = disabledModules.has(descriptor.key.toLowerCase()) ? false : descriptor.enabled;

    return {
      ...descriptor,
      visibility: resolveVisibility(descriptor, privateModules, publicModules),
      enabled
    };
  });
}

export const moduleAccessMatrix: ModuleDescriptor[] = buildModuleMatrix();

export function getNavigationModules(): ModuleDescriptor[] {
  return moduleAccessMatrix.filter((descriptor) => descriptor.enabled && descriptor.key !== "acceso");
}

export function getModuleByPath(pathname: string): ModuleDescriptor | null {
  const normalizedPath = pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname;

  const matches = moduleAccessMatrix
    .filter((descriptor) => {
      if (!descriptor.enabled) {
        return false;
      }

      if (normalizedPath === descriptor.path) {
        return true;
      }

      return normalizedPath.startsWith(`${descriptor.path}/`);
    })
    .sort((a, b) => b.path.length - a.path.length);

  return matches[0] ?? null;
}

export function isPathPrivate(pathname: string): boolean {
  const descriptor = getModuleByPath(pathname);
  return Boolean(descriptor && descriptor.visibility === "private");
}
