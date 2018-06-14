import { Summary } from './model/summary.model';
import { LauncherModule } from './launcher.module';
import { BroadcastService } from './service/broadcast.service';
import * as _ from 'lodash';

export function broadcast(event: string, properties: any) : MethodDecorator {
  return function(target: Function, key: string, descriptor: any) {

    const originalMethod = descriptor.value;

    descriptor.value =  function (...args: any[]) {

      const broadcast: BroadcastService = LauncherModule.injector.get(BroadcastService);

      const mapKeys = (properties: any, base?: string): any => {
        Object.keys(properties).forEach(key => {
          if (typeof properties[key] === 'object') {
            mapKeys(properties[key], key);
          } else {
            properties[key] = _.get(this, (base || '') + '.' + properties[key]);
          }
        });
      };

      let props = _.cloneDeep(properties);
      mapKeys(props);
      broadcast.broadcast(event, props);
      return originalMethod.apply(this, args);
    }

    return descriptor;
  }
}

