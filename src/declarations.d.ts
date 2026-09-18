declare module '*.glb' {
  const value: number; // Metro returns an asset reference (a number/require id)
  export default value;
}

declare module '*.jpg' {
  const value: number; // Metro returns an asset reference (a number/require id)
  export default value;
}
