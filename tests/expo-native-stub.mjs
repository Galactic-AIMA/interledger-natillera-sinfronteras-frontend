export const Platform={OS:'web',select:(o)=>o.web??o.default};
export const getItemAsync=async()=>null;export const setItemAsync=async()=>{};export const deleteItemAsync=async()=>{};
export const createURL=(p)=>'natillera://'+p;export const parse=(u)=>({queryParams:Object.fromEntries(new URL(u).searchParams)});
