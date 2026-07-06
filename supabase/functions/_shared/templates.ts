export function baseLayout(title: string, contentHtml: string): string {
  return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f4f4f5;
      color: #18181b;
      line-height: 1.5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .header {
      background-color: #7b1113; /* Bordeaux Pro Pontedecimo */
      color: #ffffff;
      padding: 32px 24px;
      text-align: center;
      border-bottom: 4px solid #d4af37; /* Oro */
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 900;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      font-style: italic;
    }
    .content {
      padding: 32px 24px;
    }
    .footer {
      background-color: #f4f4f5;
      color: #71717a;
      padding: 24px;
      text-align: center;
      font-size: 12px;
      border-top: 1px solid #e4e4e7;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ASD Pro Pontedecimo</h1>
    </div>
    <div class="content">
      ${contentHtml}
    </div>
    <div class="footer">
      <p><strong>ASD Pro Pontedecimo 1926</strong></p>
      <p>Questa è un'email generata automaticamente, si prega di non rispondere.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export interface MedicalReminderData {
  playerName: string;
  expiryDate: string; // Formatted date string
  daysLeft: number;
}

export function medicalReminderTemplate(data: MedicalReminderData): string {
  const isExpired = data.daysLeft < 0;
  const statusColor = isExpired ? '#ef4444' : (data.daysLeft <= 15 ? '#f59e0b' : '#10b981');
  const statusText = isExpired 
    ? 'SCADUTA' 
    : (data.daysLeft === 0 ? 'SCADE OGGI' : `IN SCADENZA TRA ${data.daysLeft} GIORNI`);

  const content = `
    <h2 style="margin-top: 0; color: #18181b; font-size: 20px;">Promemoria Visita Medica Sportiva</h2>
    <p>Gentile famiglia,</p>
    <p>Vi ricordiamo che la visita medico-sportiva per l'atleta <strong>${data.playerName}</strong> necessita della vostra attenzione.</p>
    
    <div style="background-color: #fafafa; border-left: 4px solid ${statusColor}; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em;">Stato della visita</p>
      <p style="margin: 0; font-size: 18px; font-weight: 700; color: ${statusColor};">${statusText}</p>
      <p style="margin: 8px 0 0 0; font-size: 16px;">Data di scadenza: <strong>${data.expiryDate}</strong></p>
    </div>

    <p>Vi preghiamo di provvedere al rinnovo e di consegnare la copia originale del certificato in segreteria il prima possibile.</p>
    <p>Ricordiamo che, per motivi legali e assicurativi, in assenza di un certificato medico in corso di validità <strong>l'atleta non potrà partecipare agli allenamenti né alle partite ufficiali</strong>.</p>
    
    <p style="margin-top: 32px;">Cordiali saluti,<br/>La Segreteria<br/><strong>ASD Pro Pontedecimo</strong></p>
  `;

  return baseLayout(`Promemoria Visita Medica - ${data.playerName}`, content);
}
