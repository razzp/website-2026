import { PageEntitiesHelper } from '../components/PageEntitiesHelper';

const pageEntities = new PageEntitiesHelper();

function init(): void {
    console.log('work initialised');
}

function destroy(): void {
    pageEntities.killAll();

    console.log('work destroyed');
}

export { destroy, init };
