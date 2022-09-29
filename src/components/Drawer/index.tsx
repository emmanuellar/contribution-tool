import { FiChevronLeft as IconCollapse, FiChevronRight as IconExpand } from 'react-icons/fi';

import React from 'react';
import s from './Drawer.module.css';
import { useToggle } from 'react-use';
import classNames from 'classnames';

const Drawer: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => {
  const [expanded, toggleExpanded] = useToggle(true);

  return (
    <section className={classNames(s.wrapper, { [s.expanded]: expanded }, className)} {...props}>
      <button className={s.expander} onClick={toggleExpanded}>
        {expanded ? <IconCollapse /> : <IconExpand />}
      </button>
      <div>{children}</div>
    </section>
  );
};

export default Drawer;
