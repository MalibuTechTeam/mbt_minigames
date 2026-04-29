import { useMinigameStore } from "../store/useMinigameStore";

export const fetchNui = async (eventName: string, data: any = {}): Promise<any> => {
  const resourceName = (window as any).GetParentResourceName
    ? (window as any).GetParentResourceName()
    : 'mbt_minigames';

  try {
    const resp = await fetch(`https://${resourceName}/${eventName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(data),
    });
    return await resp.json();
  } catch (err) {
    debugLog(`fetchNui error on "${eventName}": ${err}`);
    return null;
  }
};

export const debugLog = (msg: string) => {
    const isDebug = useMinigameStore.getState().debug;
    if (isDebug) {
        console.log(`[mbt_minigames UI] ${msg}`);
    }
}
