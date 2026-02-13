export const fetchNui = async (eventName: string, data: any = {}) => {
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify(data),
  };

  const resourceName = (window as any).GetParentResourceName ? (window as any).GetParentResourceName() : 'mbt_minigames';

  const resp = await fetch(`https://${resourceName}/${eventName}`, options);

  const respFormatted = await resp.json();

  return respFormatted;
};

export const debugLog = (msg: string) => {
    console.log(`[MBT Minigames UI] ${msg}`);
}
