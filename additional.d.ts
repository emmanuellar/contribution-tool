type WithClassname<T = {}> = T & { className?: string };

declare module 'open-terms-archive/fetch';
declare module 'open-terms-archive/filter';
declare module 'open-terms-archive/page-declaration';

declare module '*.svg' {
  const content: React.FC<React.SVGProps<SVGSVGElement>>;
  export default content;
}
