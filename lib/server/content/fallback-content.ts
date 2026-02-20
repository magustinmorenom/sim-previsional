import type {
  ContactChannel,
  DocumentItem,
  FaqItem,
  ProcessGuide
} from "@/lib/types/content";

export const fallbackDocuments: DocumentItem[] = [
  {
    id: "doc-tasas-vigentes",
    title: "Tasas vigentes",
    category: "Préstamos",
    topic: "Tasas",
    fileType: "pdf",
    url: "https://sps.cpceer.org.ar/wp-content/uploads/2022/12/tasas-noviembre-2025.pdf",
    publishedAt: "2025-11-01",
    tags: ["tasas", "prestamos", "vigencia"],
    isNormative: false,
    sourcePage: "https://sps.cpceer.org.ar/prestamos"
  },
  {
    id: "doc-prestamos-tradicionales",
    title: "Solicitud préstamos tradicionales",
    category: "Préstamos",
    topic: "Formularios",
    fileType: "docx",
    url: "https://sps.cpceer.org.ar/wp-content/uploads/2024/03/Formulario-SOLICITUD-PRÉSTAMOS_TRADICIONALES.docx",
    publishedAt: "2024-03-01",
    tags: ["prestamos", "formulario", "solicitud"],
    isNormative: false,
    sourcePage: "https://sps.cpceer.org.ar/prestamos/formularios"
  },
  {
    id: "doc-prestamos-nuevas-lineas",
    title: "Solicitud préstamos nuevas líneas",
    category: "Préstamos",
    topic: "Formularios",
    fileType: "docx",
    url: "https://sps.cpceer.org.ar/wp-content/uploads/2024/03/Formulario-SOLICITUD-PRÉSTAMOS_NUEVAS-LÍNEAS.docx",
    publishedAt: "2024-03-01",
    tags: ["prestamos", "formulario", "nuevas-lineas"],
    isNormative: false,
    sourcePage: "https://sps.cpceer.org.ar/prestamos/formularios"
  },
  {
    id: "doc-garante-codeudor",
    title: "Datos garante - codeudor",
    category: "Préstamos",
    topic: "Formularios",
    fileType: "docx",
    url: "https://sps.cpceer.org.ar/wp-content/uploads/2025/03/Formulario-DATOS-GARANTE-CODEUDOR.docx",
    publishedAt: "2025-03-01",
    tags: ["prestamos", "garante", "codeudor"],
    isNormative: false,
    sourcePage: "https://sps.cpceer.org.ar/prestamos/formularios"
  },
  {
    id: "doc-certificacion-empleo",
    title: "Certificación de empleo",
    category: "Préstamos",
    topic: "Formularios",
    fileType: "docx",
    url: "https://sps.cpceer.org.ar/wp-content/uploads/2024/03/Formulario-CERTIFICACIÓN-DE-EMPLEO.docx",
    publishedAt: "2024-03-01",
    tags: ["prestamos", "ingresos", "certificacion"],
    isNormative: false,
    sourcePage: "https://sps.cpceer.org.ar/prestamos/formularios"
  },
  {
    id: "doc-prestamo-sola-firma",
    title: "Detalle préstamo a sola firma",
    category: "Préstamos",
    topic: "Líneas",
    fileType: "pdf",
    url: "https://sps.cpceer.org.ar/wp-content/uploads/2019/09/PRESTAMOS-A-SOLA-FIRMA-0725.pdf",
    publishedAt: "2025-07-01",
    tags: ["prestamos", "sola-firma", "detalle"],
    isNormative: false,
    sourcePage: "https://sps.cpceer.org.ar/prestamo/sola-firma-tasa-fija"
  },
  {
    id: "doc-prestamo-personales-garantia",
    title: "Detalle préstamos personales con garantía",
    category: "Préstamos",
    topic: "Líneas",
    fileType: "pdf",
    url: "https://sps.cpceer.org.ar/wp-content/uploads/2019/09/PRESTAMOS-PERSONALES-CON-GARANTIA-0725.pdf",
    publishedAt: "2025-07-01",
    tags: ["prestamos", "personales", "garantia"],
    isNormative: false,
    sourcePage: "https://sps.cpceer.org.ar/prestamo/personal-con-garantia-tasa-fija"
  },
  {
    id: "doc-prestamo-jubilados",
    title: "Detalle préstamos jubilados SPS",
    category: "Préstamos",
    topic: "Líneas",
    fileType: "pdf",
    url: "https://sps.cpceer.org.ar/wp-content/uploads/2019/09/PRESTAMOS-JUBILADOS-0725.pdf",
    publishedAt: "2025-07-01",
    tags: ["prestamos", "jubilados", "detalle"],
    isNormative: false,
    sourcePage: "https://sps.cpceer.org.ar/prestamo/jubilados-sps-tasa-fija"
  },
  {
    id: "doc-prestamo-prendario",
    title: "Detalle préstamo prendario",
    category: "Préstamos",
    topic: "Líneas",
    fileType: "pdf",
    url: "https://sps.cpceer.org.ar/wp-content/uploads/2024/03/PRESTAMOS-PRENDARIOS-0725.pdf",
    publishedAt: "2025-07-01",
    tags: ["prestamos", "prendario", "detalle"],
    isNormative: false,
    sourcePage: "https://sps.cpceer.org.ar/prestamo/prendario"
  },
  {
    id: "doc-prestamo-hipotecario",
    title: "Detalle préstamo hipotecario",
    category: "Préstamos",
    topic: "Líneas",
    fileType: "pdf",
    url: "https://sps.cpceer.org.ar/wp-content/uploads/2019/09/PRESTAMOS-HIPOTECARIOS-PRIMERA-VIVIENDA-0725.pdf",
    publishedAt: "2025-07-01",
    tags: ["prestamos", "hipotecario", "detalle"],
    isNormative: false,
    sourcePage: "https://sps.cpceer.org.ar/prestamo/hipotecario"
  },
  {
    id: "doc-simulador-consumo-xls",
    title: "Simulador consumo (legacy XLS)",
    category: "Préstamos",
    topic: "Simuladores",
    fileType: "xls",
    url: "https://sps.cpceer.org.ar/wp-content/uploads/2024/02/SIMULADOR-Consumo.xls",
    publishedAt: "2024-02-01",
    tags: ["prestamos", "simulador", "legacy"],
    isNormative: false,
    sourcePage: "https://sps.cpceer.org.ar/prestamos/calculadora-de-prestamos"
  },
  {
    id: "doc-simulador-prendario-xls",
    title: "Simulador prendario (legacy XLS)",
    category: "Préstamos",
    topic: "Simuladores",
    fileType: "xls",
    url: "https://sps.cpceer.org.ar/wp-content/uploads/2024/03/SIMULADOR-Prendario.xls",
    publishedAt: "2024-03-01",
    tags: ["prestamos", "simulador", "legacy"],
    isNormative: false,
    sourcePage: "https://sps.cpceer.org.ar/prestamos/calculadora-de-prestamos"
  },
  {
    id: "doc-simulador-personales-xls",
    title: "Simulador personales (legacy XLS)",
    category: "Préstamos",
    topic: "Simuladores",
    fileType: "xls",
    url: "https://sps.cpceer.org.ar/wp-content/uploads/2019/09/SIMULADOR-Personales.xls",
    publishedAt: "2019-09-01",
    tags: ["prestamos", "simulador", "legacy"],
    isNormative: false,
    sourcePage: "https://sps.cpceer.org.ar/prestamos/calculadora-de-prestamos"
  },
  {
    id: "doc-simulador-hipotecario-xls",
    title: "Simulador hipotecario (legacy XLS)",
    category: "Préstamos",
    topic: "Simuladores",
    fileType: "xls",
    url: "https://sps.cpceer.org.ar/wp-content/uploads/2024/03/SIMULADOR-Hipotecario.xls",
    publishedAt: "2024-03-01",
    tags: ["prestamos", "simulador", "legacy"],
    isNormative: false,
    sourcePage: "https://sps.cpceer.org.ar/prestamos/calculadora-de-prestamos"
  },
  {
    id: "doc-ficha-credencial",
    title: "Ficha para credencial",
    category: "Previsional",
    topic: "Formularios",
    fileType: "docx",
    url: "https://sps.cpceer.org.ar/wp-content/uploads/2024/04/FORM-FICHA-PARA-CREDENCIAL.docx",
    publishedAt: "2024-04-01",
    tags: ["previsional", "formulario", "credencial"],
    isNormative: false,
    sourcePage: "https://sps.cpceer.org.ar/beneficios-previsionales"
  },
  {
    id: "doc-solicitud-beneficio-previsional",
    title: "Solicitud de beneficio previsional",
    category: "Previsional",
    topic: "Formularios",
    fileType: "docx",
    url: "https://sps.cpceer.org.ar/wp-content/uploads/2024/04/FORM-SOLICITUD-BENEFICIO-PREVISIONAL.docx",
    publishedAt: "2024-04-01",
    tags: ["previsional", "beneficio", "solicitud"],
    isNormative: false,
    sourcePage: "https://sps.cpceer.org.ar/beneficios-previsionales"
  },
  {
    id: "doc-solicitud-jubilacion-ordinaria",
    title: "Solicitud jubilación ordinaria",
    category: "Previsional",
    topic: "Formularios",
    fileType: "docx",
    url: "https://sps.cpceer.org.ar/wp-content/uploads/2024/04/FORM-SOLICITUD-JUBILACION-ORDINARIA.docx",
    publishedAt: "2024-04-01",
    tags: ["previsional", "jubilacion", "ordinaria"],
    isNormative: false,
    sourcePage: "https://sps.cpceer.org.ar/beneficios-previsionales"
  },
  {
    id: "doc-solicitud-pension",
    title: "Solicitud de pensión",
    category: "Previsional",
    topic: "Formularios",
    fileType: "docx",
    url: "https://sps.cpceer.org.ar/wp-content/uploads/2024/04/FORM-SOLICITUD-DE-PENSION.docx",
    publishedAt: "2024-04-01",
    tags: ["previsional", "pension", "solicitud"],
    isNormative: false,
    sourcePage: "https://sps.cpceer.org.ar/beneficios-previsionales"
  },
  {
    id: "doc-constancia-supervivencia",
    title: "Constancia de supervivencia",
    category: "Previsional",
    topic: "Formularios",
    fileType: "docx",
    url: "https://sps.cpceer.org.ar/wp-content/uploads/2024/04/FORM-CONSTANCIA-DE-SUPERVIVENCIA.docx",
    publishedAt: "2024-04-01",
    tags: ["previsional", "supervivencia", "constancia"],
    isNormative: false,
    sourcePage: "https://sps.cpceer.org.ar/beneficios-previsionales"
  },
  {
    id: "doc-tabla-aportes-2025",
    title: "Tabla de aportes 2025 - Nuevo MRS con descuento",
    category: "Afiliados",
    topic: "Aportes",
    fileType: "pdf",
    url: "https://sps.cpceer.org.ar/wp-content/uploads/2025/09/Tabla-de-aportes-Nuevo-MRS-con-descuento.pdf",
    publishedAt: "2025-09-01",
    tags: ["afiliados", "aportes", "mrs"],
    isNormative: false,
    sourcePage: "https://sps.cpceer.org.ar/afiliados"
  },
  {
    id: "doc-optativo-baja",
    title: "Afiliados optativos - baja",
    category: "Afiliados",
    topic: "Formularios",
    fileType: "docx",
    url: "https://sps.cpceer.org.ar/wp-content/uploads/2024/06/Formulario-AFILIADOS-OPTATIVOS-BAJA.docx",
    publishedAt: "2024-06-01",
    tags: ["afiliados", "optativos", "baja"],
    isNormative: false,
    sourcePage: "https://sps.cpceer.org.ar/afiliados/formularios"
  },
  {
    id: "doc-optativo-alta",
    title: "Afiliados optativos - alta y modificación",
    category: "Afiliados",
    topic: "Formularios",
    fileType: "docx",
    url: "https://sps.cpceer.org.ar/wp-content/uploads/2024/06/Formulario-AFILIADOS-OPTATIVOS-ALTA-Y-MODIFICACIÓN-DE-DATOS.docx",
    publishedAt: "2024-06-01",
    tags: ["afiliados", "optativos", "alta"],
    isNormative: false,
    sourcePage: "https://sps.cpceer.org.ar/afiliados/formularios"
  },
  {
    id: "doc-ley-cps",
    title: "Ley de creación de la Caja",
    category: "Normativa",
    topic: "Ley",
    fileType: "pdf",
    url: "https://sps.cpceer.org.ar/wp-content/uploads/2025/02/Ley-de-Creación-de-la-Caja-BO.pdf",
    publishedAt: "2025-02-01",
    tags: ["normativa", "ley", "cps"],
    isNormative: true,
    sourcePage: "https://sps.cpceer.org.ar/cps"
  },
  {
    id: "doc-reglamento-ley-11034",
    title: "Reglamento Ley 11034",
    category: "Normativa",
    topic: "Reglamento",
    fileType: "pdf",
    url: "https://sps.cpceer.org.ar/wp-content/uploads/2025/02/Reglamento-Ley-No-11034-..pdf",
    publishedAt: "2025-02-01",
    tags: ["normativa", "reglamento", "cps"],
    isNormative: true,
    sourcePage: "https://sps.cpceer.org.ar/cps"
  },
  {
    id: "doc-reglamento-sps-2025",
    title: "Reglamento SPS 2025 (texto ordenado)",
    category: "Normativa",
    topic: "Reglamento",
    fileType: "pdf",
    url: "https://sps.cpceer.org.ar/wp-content/uploads/2025/10/REGLAMENT0-SPS-2025-Texto-Ordenado.pdf",
    publishedAt: "2025-10-01",
    tags: ["normativa", "reglamento", "sps"],
    isNormative: true,
    sourcePage: "https://sps.cpceer.org.ar/institucional/reglamentos"
  },
  {
    id: "doc-resolucion-cps-1",
    title: "Resolución Nº 1 CPS",
    category: "Normativa",
    topic: "Resoluciones",
    fileType: "pdf",
    url: "https://sps.cpceer.org.ar/wp-content/uploads/2025/02/Resolución-No1-CPS.pdf",
    publishedAt: "2025-02-01",
    tags: ["normativa", "resoluciones", "cps"],
    isNormative: true,
    sourcePage: "https://sps.cpceer.org.ar/cps"
  },
  {
    id: "doc-resolucion-1189",
    title: "Resolución 1189 - Reglamento General de Préstamos",
    category: "Normativa",
    topic: "Resoluciones",
    fileType: "pdf",
    url: "https://sps.cpceer.org.ar/wp-content/uploads/2024/03/Res.-N°-1189-Reglamento-General-de-Préstamos.pdf",
    publishedAt: "2024-03-01",
    tags: ["normativa", "prestamos", "resoluciones"],
    isNormative: true,
    sourcePage: "https://sps.cpceer.org.ar/institucional/resoluciones"
  },
  {
    id: "doc-resolucion-1170",
    title: "Resolución 1170 - Ayuda solidaria de emergencia",
    category: "Normativa",
    topic: "Resoluciones",
    fileType: "pdf",
    url: "https://sps.cpceer.org.ar/wp-content/uploads/2023/11/Res.-N°-1170-Ayuda-Solidaria-de-Emergencia.pdf",
    publishedAt: "2023-11-01",
    tags: ["normativa", "ayuda", "resoluciones"],
    isNormative: true,
    sourcePage: "https://sps.cpceer.org.ar/institucional/resoluciones"
  },
  {
    id: "doc-resolucion-1230",
    title: "Resolución 1230 - Contribución por fallecimiento",
    category: "Normativa",
    topic: "Resoluciones",
    fileType: "pdf",
    url: "https://sps.cpceer.org.ar/wp-content/uploads/2024/07/Res.-No-1230-Contribución-por-fallecimiento.pdf",
    publishedAt: "2024-07-01",
    tags: ["normativa", "fallecimiento", "resoluciones"],
    isNormative: true,
    sourcePage: "https://sps.cpceer.org.ar/institucional/resoluciones"
  }
];

export const fallbackProcesses: ProcessGuide[] = [
  {
    id: "proc-jubilacion-ordinaria",
    title: "Solicitud de jubilación ordinaria",
    audience: "Afiliados próximos a retiro",
    summary: "Trámite para acceder al beneficio previsional al cumplir edad y años de aporte requeridos.",
    steps: [
      "Revisar requisitos de edad y aportes.",
      "Completar formulario de solicitud del beneficio previsional.",
      "Reunir documentación personal y del grupo familiar.",
      "Adjuntar constancia de CBU para acreditación.",
      "Presentar documentación en delegación y realizar seguimiento."
    ],
    requirements: [
      "DNI del solicitante y grupo familiar.",
      "Ficha para credencial.",
      "Formulario de solicitud de beneficio previsional.",
      "Constancia de CBU bancaria."
    ],
    relatedDocuments: [
      "doc-solicitud-beneficio-previsional",
      "doc-solicitud-jubilacion-ordinaria",
      "doc-ficha-credencial"
    ]
  },
  {
    id: "proc-pension",
    title: "Solicitud de pensión",
    audience: "Derechohabientes",
    summary: "Proceso para iniciar pensión por fallecimiento de afiliado activo o pasivo.",
    steps: [
      "Completar la solicitud previsional y formulario de pensión.",
      "Reunir actas y documentación respaldatoria.",
      "Incluir CBU para acreditación de haberes.",
      "Presentar en delegación y validar estado del trámite."
    ],
    requirements: [
      "DNI de solicitante y derechohabientes.",
      "Acta de defunción y documentación de vínculo.",
      "Formulario de solicitud de pensión.",
      "Constancia de CBU."
    ],
    relatedDocuments: [
      "doc-solicitud-beneficio-previsional",
      "doc-solicitud-pension",
      "doc-ficha-credencial"
    ]
  },
  {
    id: "proc-prestamo",
    title: "Solicitud de préstamo",
    audience: "Afiliados activos y pasivos según línea",
    summary: "Circuito estándar para solicitar créditos y presentar documentación de respaldo.",
    steps: [
      "Elegir línea de préstamo y revisar tasas vigentes.",
      "Completar formulario de solicitud correspondiente.",
      "Adjuntar certificación de empleo e información de ingresos.",
      "Agregar datos de garante/codeudor si aplica.",
      "Presentar documentación y esperar evaluación."
    ],
    requirements: [
      "Formulario de solicitud de préstamo.",
      "Certificación de empleo.",
      "Datos de garante/codeudor (si corresponde).",
      "Cumplir condiciones de antigüedad y mora."
    ],
    relatedDocuments: [
      "doc-prestamos-tradicionales",
      "doc-prestamos-nuevas-lineas",
      "doc-certificacion-empleo",
      "doc-garante-codeudor",
      "doc-tasas-vigentes"
    ]
  },
  {
    id: "proc-afiliado-optativo",
    title: "Alta o baja de afiliado optativo",
    audience: "Afiliados optativos",
    summary: "Gestión de actualización de condición optativa mediante formularios específicos.",
    steps: [
      "Definir si corresponde alta, modificación o baja.",
      "Completar el formulario correspondiente.",
      "Adjuntar CBU o documentación solicitada.",
      "Presentar en delegación para registrar cambio."
    ],
    requirements: [
      "Formulario de alta/modificación o baja.",
      "Constancia de CBU cuando corresponda.",
      "Identificación del afiliado."
    ],
    relatedDocuments: ["doc-optativo-alta", "doc-optativo-baja"]
  }
];

export const fallbackFaqItems: FaqItem[] = [
  {
    id: "faq-bov",
    section: "Previsional",
    question: "¿Qué es el Beneficio Objetivo Vigente (BOV)?",
    answer:
      "Es un valor de referencia utilizado para aportes y proyecciones previsionales dentro del sistema.",
    relatedDocuments: ["doc-tabla-aportes-2025"]
  },
  {
    id: "faq-aportes-voluntarios",
    section: "Previsional",
    question: "¿Cómo impactan los aportes voluntarios en el haber?",
    answer:
      "Los aportes voluntarios se acumulan en la cuenta individual y pueden incrementar el beneficio o recuperarse según la normativa vigente.",
    relatedDocuments: ["doc-tabla-aportes-2025", "doc-solicitud-beneficio-previsional"]
  },
  {
    id: "faq-certificado-supervivencia",
    section: "Previsional",
    question: "¿Cada cuánto debo presentar certificado de supervivencia?",
    answer:
      "Con periodicidad trimestral en la delegación correspondiente, según la guía operativa del sistema.",
    relatedDocuments: ["doc-constancia-supervivencia"]
  },
  {
    id: "faq-medios-pago",
    section: "Afiliados",
    question: "¿Qué medios de pago están habilitados para aportes?",
    answer:
      "Entre Ríos Servicios, Red Link, Banelco/Pago Mis Cuentas y adhesión a débito automático, según disponibilidad del afiliado.",
    relatedDocuments: ["doc-tabla-aportes-2025"]
  },
  {
    id: "faq-prestamo-documentacion",
    section: "Préstamos",
    question: "¿Qué documentación debo presentar para solicitar un préstamo?",
    answer:
      "Formulario de solicitud, documentación de ingresos y, cuando aplique, datos del garante o codeudor.",
    relatedDocuments: [
      "doc-prestamos-tradicionales",
      "doc-certificacion-empleo",
      "doc-garante-codeudor"
    ]
  },
  {
    id: "faq-prestamo-amortizacion",
    section: "Préstamos",
    question: "¿Cómo se amortizan los préstamos?",
    answer:
      "Depende de la línea: la mayoría utiliza sistema francés y algunas líneas específicas pueden usar otro sistema definido por reglamento.",
    relatedDocuments: ["doc-prestamo-sola-firma", "doc-prestamo-hipotecario"]
  },
  {
    id: "faq-prestamo-adelanto",
    section: "Préstamos",
    question: "¿Puedo adelantar cuotas?",
    answer:
      "La posibilidad de adelantar cuotas depende de las condiciones de cada línea y del reglamento general de préstamos.",
    relatedDocuments: ["doc-reglamento-sps-2025", "doc-resolucion-1189"]
  },
  {
    id: "faq-afiliado-optativo",
    section: "Afiliados",
    question: "¿Cómo solicito la baja como afiliado optativo?",
    answer:
      "Debe presentarse el formulario de baja y la documentación indicada en la sección de afiliados/formularios.",
    relatedDocuments: ["doc-optativo-baja"]
  }
];

export const fallbackContactChannels: ContactChannel[] = [
  {
    id: "contact-whatsapp",
    name: "WhatsApp",
    description: "Canal rápido para consultas generales y orientación inicial.",
    type: "whatsapp",
    url: "https://sps.cpceer.org.ar",
    availability: "Lunes a viernes, horario administrativo"
  },
  {
    id: "contact-email",
    name: "Correo electrónico",
    description: "Canal formal para consultas y envío de documentación.",
    type: "email",
    url: "mailto:plataforma@cajaceer.org.ar",
    availability: "Respuesta dentro de 24/48 hs hábiles"
  },
  {
    id: "contact-phone",
    name: "Atención telefónica",
    description: "Atención por delegaciones para dudas de trámites y estado.",
    type: "phone",
    url: "https://sps.cpceer.org.ar/cps",
    availability: "Ver teléfonos por delegación"
  }
];
