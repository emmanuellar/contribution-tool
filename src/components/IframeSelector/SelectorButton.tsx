import React from 'react';
import Button from 'modules/Common/components/Button';
import { FiTrash2 } from 'react-icons/fi';

type SelectorButtonProps = {
  onChange: any;
  onRemove: any;
  defaultValue: string;
} & React.HTMLAttributes<HTMLDivElement>;

const SelectorButton: React.FC<SelectorButtonProps> = ({
  onChange,
  onRemove,
  defaultValue,
  className,
  ...props
}) => {
  return (
    <div key={defaultValue} className={className} {...props}>
      <input defaultValue={defaultValue} onChange={onChange} />

      <Button onClick={onRemove} type="secondary" size="sm" onlyIcon={true}>
        <FiTrash2 />
      </Button>
    </div>
  );
};

export default SelectorButton;
