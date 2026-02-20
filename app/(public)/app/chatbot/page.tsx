import { CpsChatbotPanel } from "@/app/_features/chatbot/cps-chatbot-panel";

export default function ChatbotPage() {
  return (
    <section className="anx-stack">
      <article className="anx-panel anx-section-header">
        <h1>Chatbot documental CPS</h1>
        <p>
          Consultá procesos, normativa y documentación disponible en la base de conocimiento.
          Si no hay respaldo en los documentos, el asistente te lo indicará.
        </p>
      </article>

      <CpsChatbotPanel />
    </section>
  );
}
