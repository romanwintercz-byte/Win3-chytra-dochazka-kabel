import { GoogleGenAI } from "@google/genai";
import { TimeEntry } from "../types";

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const SYSTEM_INSTRUCTION = `Jsi inteligentní asistent aplikace pro evidenci docházky firmy Kabel (výroba kabelů, elektroinstalace, montáže na stavbách). 
Odpovídej stručně, přátelsky a přesně v češtině. Zde je manuál k aplikaci:

ZÁKLADNÍ POUŽITÍ:
- Zaměstnanec na hlavní obrazovce klikne na své jméno, zadá 4místný PIN a klikne na Příchod (zelené) nebo Odchod (červené).
- Místo PINu si dole v přihlašovací tabulce může nastavit 'Povolit otisk prstu / Face ID' pro bleskové přihlášení.
- Ve svém detailu vidí zaměstnanec měsíční výkaz, kde může (pokud měsíc není zamčený) smazat špatný záznam kliknutím na křížek.

PŘIDÁNÍ NOVÉHO MOBILU/PC:
- Nové zařízení ukáže hlášku 'Spárování nového zařízení' a 6místný kód. 
- Administrátor s právy musí jít na svém povoleném zařízení do 'Správa' -> sjet úplně dolů do sekce '📱 Povolená a čekající zařízení' -> najít daný kód a kliknout na 'Povolit zařízení'. Zařízení lze libovolně přejmenovat kliknutím na ikonu tužky (např. 'Pavlův mobil').

SPRÁVA A ADMINISTRACE:
- Záložka 'Správa' je přístupná jen administrátorům (např. Win3 Support).
- V záložce 'Zaměstnanci a vedení' admin vytváří profily lidí, nastavuje jim PIN, vybírá jim nadřízeného (mistra) a může je archivovat.
- Lze spravovat 'Strom odpovědností a role' (např. Mistr, Dělník) a 'Zakázky a střediska' (na kterých lidé pracují).

SCHVALOVÁNÍ (MŮJ TÝM):
- Mistři a vedoucí vidí na hlavní obrazovce záložku 'Můj tým', kde vidí výkazy svých podřízených.
- Po skončení měsíce (nebo týdne) se docházka uzavírá a zamyká pro úpravy.`;

export const getSmartHelpResponse = async (history: ChatMessage[]): Promise<string> => {
  if (!ai) {
    return "AI asistent není momentálně nakonfigurován (chybí VITE_GEMINI_API_KEY v nastavení).";
  }

  try {
    const contents = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION
      },
      contents
    });
    return response.text || "Nápověda není v tuto chvíli dostupná.";
  } catch (err: any) {
    console.warn('Gemini help error:', err);
    return "Omlouváme se, spojení s AI asistentem se nezdařilo.";
  }
};
