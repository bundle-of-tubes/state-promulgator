# state-promulgator
A state object with a registry of callbacks to execute when state attributes are changed

The motivating use case is creation of [Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) with states like React Components. Except unlike [React](https://react.dev) and [Lit](https://lit.dev), `StatePromulgator` allows components to minimally interact with the DOM instead of completely re-rendering.

## Usage
This module exports two classes: `StatePromulgatorError` and `StatePromulgator`. It works for both typescript and javascript.

Each instance of `StatePromulgator` has a state which is an object with string keys. It also has a registry of callbacks configured to execute when the state is updated.

### StatePromulgator Constructor
#### Parameters
* initialState: The initial value of the state object

#### Examples
```javascript
import {StatePromulgator} from '@bundle-of-tubes/state-promulgator';
const stateMachine = new StatePromulgator({message: 'message', value: 0});
```

```typescript
import {StatePromulgator} from '@bundle-of-tubes/state-promulgator';
interface PaginatorState {
  skip: number;
  take: number;
  pageSize: number;
  totalRows: number;
}
const stateMachine = new StatePromulgator<PaginatorState>({skip: 0, take: 0, pageSize: 20, totalRows: 0});
```

### StatePromulgator.prototype.state
The current state value

### StatePromulgator.prototype.registerCallback()
Declare a callback to be executed when certain properties of the state are updated
#### Parameters
* callback: The function to be executed in state transitions.
    * The first parameter of callback is the new value of the state
    * The second parameter of the callback is the previous value of the state
    * The third parameter of the callback is a Map where the keys are the return values of previously declared intermediates and the values are the return values of associated callbacks
    * The return value of callback will be accessible to other callbacks via the third parameter
* triggeringStateProperties: An Iterable representing the set of attributes of the state which when changed cause this callback to run
* intermediateDependencies: An Iterable representing the set of keys of other intermediates that need to be computed before this
#### Return Value
A Symbol representing the key of the registered callback
#### Examples
```javascript
const k = stateMachine.registerCallback((newState, oldState, dependencies)=>{
  return newState.value + oldState.value;
}, new Set(), new Set());
stateMachine.registerCallback((newState, oldState, dependencies)=>{
  console.log('message changed from ', oldState.message, 'to ', newState.message);
  console.log('callback1 returned: ', dependencies.get(k));
}, ['value'], [k]);
```

```typescript
const pageNumberKey: symbol = stateMachine.registerCallback((newState: PaginatorState, oldState: PaginatorState, dependencies: Map<symbol,any>)=>{
  const skip = newState.skip as number;
  const pageSize = newState.pageSize as number;
  return Math.floor(skip/pageSize)+1;
}, new Set(), new Set());
stateMachine.registerCallback((newState: PaginatorState, oldState: PaginatorState, dependencies: Map<symbol, any>)=>{
  const pageNumber = dependencies.get(pageNumberKey) as number;
  console.log('current page is', pageNumber);
}, ['skip', 'take'], [pageNumberKey]);
```

### StatePromulgator.prototype.updateState()
Merge the new state with the existing state and execute the callbacks that are triggered by updated state attributes
#### Parameters
* newState: An object whose properties represent attributes of the state to be updated
* promulgateUnchangedProperties: If true, callbacks will trigger for all properties of newState, even if they are identical to those of the old state
#### Examples
```javascript
stateMachine.updateState({message: 'unwatched'}); //no callbacks are triggered because value is omitted, and value will be unchanged
stateMachine.updateState({message: 'identical', value: 0}); //no callbacks are triggered because value is unchanged
stateMachine.updateState({message: 'identical', value: 0}, true); //callbacks are triggered because of the promulgateUnchangedProperties flag
stateMachine.updateState({message: 'fibonacci', value: 1}); //callbacks are triggered because value is changed
```

```typescript
stateMachine.updateState({totalRows: 32});
stateMachine.updateState({skip: 20, take: 12});
stateMachine.updateState({pageSize: 10, take: 10});
```

### StatePromulgatorError
An Error subclass
