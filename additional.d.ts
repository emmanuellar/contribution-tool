type WithClassname<T = {}> = T & { className?: string };

declare module '@opentermsarchive/engine/fetch';
declare module '@opentermsarchive/engine/filter';
declare module '@opentermsarchive/engine/page-declaration';

declare module '*.svg' {
  const content: React.FC<React.SVGProps<SVGSVGElement>>;
  export default content;
}
