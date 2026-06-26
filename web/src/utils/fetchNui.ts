import { useMinigameStore } from "../store/useMinigameStore";

type ParentWindow = Window & { GetParentResourceName?: () => string };

export const fetchNui = async (
  eventName: string,
  data: Record<string, unknown> = {},
): Promise<unknown> => {
  const parent = window as ParentWindow;
  const resourceName = parent.GetParentResourceName
    ? parent.GetParentResourceName()
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
