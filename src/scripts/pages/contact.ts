import { PageEntitiesHelper } from '../components/PageEntitiesHelper';

const pageEntities = new PageEntitiesHelper();

function init(): void {
    console.log('contact initialised');
}

function destroy(): void {
    pageEntities.killAll();

    console.log('contact destroyed');
}

export { destroy, init };
