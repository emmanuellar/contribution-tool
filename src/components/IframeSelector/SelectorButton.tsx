import React from 'react';
import Button from 'modules/Common/components/Button';
import type { OTASelector, OTARangeSelector } from 'modules/Common/services/open-terms-archive';
import { useDebounce, useLocalStorage, usePrevious } from 'react-use';
import { FiTrash2 as RemoveIcon, FiRepeat as SwitchIcon } from 'react-icons/fi';
import s from './SelectorButton.module.css';
import classNames from 'classnames';

type SelectorButtonProps = {
  onInputChange: any;
  onRemove?: any;
  value: OTASelector;
  withSwitch?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

const SelectorButton: React.FC<SelectorButtonProps> = ({
  onInputChange: onChange,
  onRemove,
  value,
  className,
  withSwitch = true,
  ...props
}) => {
  const previousValue = usePrevious(value);
  const [alertViewed, setAlertViewed] = useLocalStorage<boolean>(
    'sc-startBefore-experiment-viewed',
    false
  );

  const [loadingState, setLoadingState] = React.useState<'typing' | 'loading' | undefined>();
  const [selector, setSelector] = React.useState<OTASelector>(value);
  const [debouncedSelector, setDebouncedSelector] = React.useState<string | undefined>();

  const isRangeObject = selector && typeof selector === 'object';

  React.useEffect(() => {
    if (previousValue && previousValue !== value) {
      setLoadingState(undefined);
    }
  }, [previousValue, value]);

  const updateSelector = React.useCallback(
    (newSelector: OTASelector) => {
      setSelector(newSelector);
      setDebouncedSelector(
        typeof newSelector === 'object' ? JSON.stringify(newSelector) : newSelector
      );
    },
    [isRangeObject]
  );

  useDebounce(
    () => {
      if (debouncedSelector !== undefined) {
        setLoadingState('loading');
        onChange(debouncedSelector);
        setDebouncedSelector(undefined);
      }
      // In case a problem happens, always make the input
      // available again as it is frustrating to have to reload the page
      const timeout = setTimeout(() => setLoadingState(undefined), 3000);
      return () => clearTimeout(timeout);
    },
    1500,
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
    (key: keyof OTARangeSelector) => (e: any) => {
      const newSelector = e.target.value;
      const newObject = { ...(selector as OTARangeSelector) };

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
      <div className={className} {...props}>
        {!isRangeObject && (
          <input
            defaultValue={selector}
            className={classNames(s.input, s[`input--${loadingState}`])}
            onInput={(e: any) => setDebouncedSelector(e.target.value)}
            onChange={() => setLoadingState('typing')}
            disabled={loadingState === 'loading'}
          />
        )}
        {isRangeObject && (
          <table>
            <tr>
              <td>startBefore</td>
              <td>
                <input
                  defaultValue={selector?.startBefore}
                  className={classNames(s.input, s[`input--${loadingState}`])}
                  onInput={onObjectChange('startBefore')}
                  disabled={!!selector?.startAfter || loadingState === 'loading'}
                />
              </td>
            </tr>
            <tr>
              <td>startAfter</td>
              <td>
                <input
                  defaultValue={selector?.startAfter}
                  className={classNames(s.input, s[`input--${loadingState}`])}
                  onInput={onObjectChange('startAfter')}
                  disabled={!!selector?.startBefore || loadingState === 'loading'}
                />
              </td>
            </tr>
            <tr>
              <td>endBefore</td>
              <td>
                <input
                  defaultValue={selector?.endBefore}
                  className={classNames(s.input, s[`input--${loadingState}`])}
                  onInput={onObjectChange('endBefore')}
                  disabled={!!selector?.endAfter || loadingState === 'loading'}
                />
              </td>
            </tr>
            <tr>
              <td>endAfter</td>
              <td>
                <input
                  defaultValue={selector?.endAfter}
                  className={classNames(s.input, s[`input--${loadingState}`])}
                  onInput={onObjectChange('endAfter')}
                  disabled={!!selector?.endBefore || loadingState === 'loading'}
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
        {onRemove && (
          <Button onClick={onRemove} type="secondary" color="red" size="sm" onlyIcon={true}>
            <RemoveIcon />
          </Button>
        )}
      </div>
    </>
  );
};

export default SelectorButton;
