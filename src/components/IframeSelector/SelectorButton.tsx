import React from 'react';
import Button from 'modules/Common/components/Button';
import { useDebounce, useLocalStorage } from 'react-use';
import { FiTrash2 as RemoveIcon, FiRepeat as SwitchIcon } from 'react-icons/fi';

type SelectorButtonProps = {
  onChange: any;
  onRemove?: any;
  value: string;
  withSwitch?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

interface RangeSelector {
  startBefore?: string;
  endBefore?: string;
  startAfter?: string;
  endAfter?: string;
}

type InputValue = string | RangeSelector;

const SelectorButton: React.FC<SelectorButtonProps> = ({
  onChange,
  onRemove,
  value,
  className,
  withSwitch = true,
  ...props
}) => {
  let selectorValue: InputValue;
  const [alertViewed, setAlertViewed] = useLocalStorage<boolean>(
    'sc-startBefore-experiment-viewed',
    false
  );

  try {
    selectorValue = JSON.parse(value) as RangeSelector;
  } catch (e) {
    selectorValue = value as string;
  }

  const [selector, setSelector] = React.useState<InputValue>(selectorValue);
  const [debouncedSelector, setDebouncedSelector] = React.useState<string>();
  const isRangeObject = typeof selector === 'object';

  const updateSelector = React.useCallback(
    (newSelector: InputValue) => {
      setSelector(newSelector);
      setDebouncedSelector(
        typeof newSelector === 'object' ? JSON.stringify(newSelector) : newSelector
      );
    },
    [isRangeObject]
  );

  useDebounce(
    () => {
      if (debouncedSelector) {
        onChange(debouncedSelector);
      }
    },
    500,
    [debouncedSelector]
  );

  const onSwitch = () => {
    if (isRangeObject) {
      const newSelector: string = (selector as any)[
        Object.keys(selector as any).filter(Boolean)[0] || 'startBefore'
      ];
      updateSelector(newSelector);
    } else {
      updateSelector({ startBefore: selector });
    }
  };

  const onObjectChange = React.useCallback(
    (key: keyof RangeSelector) => (e: any) => {
      const newSelector = e.target.value;
      const newObject = { ...(selector as RangeSelector) };

      if (newSelector) {
        newObject[key] = newSelector;
      } else {
        delete newObject[key];
      }
      updateSelector(newObject);
    },
    [selector, updateSelector]
  );

  return (
    <>
      {withSwitch && isRangeObject && !alertViewed && (
        <button onClick={() => setAlertViewed(true)}>
          This feature is experimental, please make sure you know what you're doing.
          <br />
          <br />
          Click to dismiss.
        </button>
      )}
      <div key={value} className={className} {...props}>
        {!isRangeObject && <input defaultValue={selector} onInput={onChange} />}
        {isRangeObject && (
          <table>
            <tr>
              <td>startBefore</td>
              <td>
                <input
                  defaultValue={selector?.startBefore}
                  onInput={onObjectChange('startBefore')}
                  disabled={!!selector?.startAfter}
                />
              </td>
            </tr>
            <tr>
              <td>startAfter</td>
              <td>
                <input
                  defaultValue={selector?.startAfter}
                  onInput={onObjectChange('startAfter')}
                  disabled={!!selector?.startBefore}
                />
              </td>
            </tr>
            <tr>
              <td>endBefore</td>
              <td>
                <input
                  defaultValue={selector?.endBefore}
                  onInput={onObjectChange('endBefore')}
                  disabled={!!selector?.endAfter}
                />
              </td>
            </tr>
            <tr>
              <td>endAfter</td>
              <td>
                <input
                  defaultValue={selector?.endAfter}
                  onInput={onObjectChange('endAfter')}
                  disabled={!!selector?.endBefore}
                />
              </td>
            </tr>
          </table>
        )}

        {withSwitch && (
          <Button onClick={onSwitch} size="sm" onlyIcon={true}>
            <SwitchIcon />
          </Button>
        )}
        <Button onClick={onRemove} type="secondary" color="red" size="sm" onlyIcon={true}>
          <RemoveIcon />
        </Button>
      </div>
    </>
  );
};

export default SelectorButton;
