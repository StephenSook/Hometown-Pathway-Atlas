/**
 * Module declarations for assets imported as data.
 * Keeps TS happy without enabling resolveJsonModule (which would try to
 * literal-type the large us-atlas TopoJSON files and slow type checking).
 */

declare module 'us-atlas/*.json' {
  /** TopoJSON object — opaque to consumers, passed straight to react-simple-maps. */
  const value: object;
  export default value;
}
