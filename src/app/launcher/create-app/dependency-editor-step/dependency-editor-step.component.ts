import {
    Component,
    DoCheck,
    Host,
    Input,
    KeyValueDiffers,
    OnInit,
    OnDestroy,
    ViewEncapsulation,
    Optional
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs/Subscription';

import { DependencyEditorService } from '../../service/dependency-editor.service';
import { DependencyCheckService } from '../../service/dependency-check.service';
import { Selection } from '../../model/selection.model';
import { LauncherComponent } from '../../launcher.component';
import { LauncherStep } from '../../launcher-step';
import { DependencyEditor } from '../../model/dependency-editor/dependency-editor.model';
import { Summary } from '../../model/summary.model';
import { broadcast } from '../../shared/telemetry.decorator';

@Component({
    encapsulation: ViewEncapsulation.None,
    selector: 'f8launcher-dependencychecker-createapp-step',
    templateUrl: './dependency-editor-step.component.html',
    styleUrls: ['./dependency-editor-step.component.less']
})
export class DependencyEditorCreateappStepComponent extends LauncherStep implements OnInit, OnDestroy, DoCheck {
    @Input() id: string;

    public github: string = '';
    public gitref: string = '';
    public boosterInfo: any = null;
    public metadataInfo: any = null;
    private cacheInfo: any = {};
    private changes: any = {};

    private subscriptions: Subscription[] = [];
    constructor(
        @Host() public launcherComponent: LauncherComponent,
        @Optional() private depEditorService: DependencyEditorService,
        private dependencyCheckService: DependencyCheckService,
        private keyValueDiffers: KeyValueDiffers
    ) {
        super();
        if (this.launcherComponent.summary) {
            this.launcherComponent.summary['dependencyEditor'] = new DependencyEditor();
        }
    }

    ngOnDestroy() {
        this.subscriptions.forEach((sub) => {
            sub.unsubscribe();
        });
    }


    ngOnInit() {
        this.changes = this.keyValueDiffers.find(this.launcherComponent.summary).create(null);
        this.launcherComponent.addStep(this);
        this.dependencyCheckService.getDependencyCheck()
        .subscribe((val) => {
            this.metadataInfo = val;
        });
    }

    ngDoCheck() {
        let updates: any = this.changes.diff(this.launcherComponent.summary);
        if (updates) {
            updates.forEachChangedItem((r: any) => {
                this.listenForChanges(r);
            });
            updates.forEachAddedItem((r: any) => {
                this.listenForChanges(r);
            });
            updates.forEachRemovedItem((r: any) => {
                this.listenForChanges(r);
            });
        }
    }

    // Accessors
    /**
     * Returns indicator that step is completed
     *
     * @returns {boolean} True if step is completed
     */
    get stepCompleted(): boolean {
            return (this.launcherComponent.summary.dependencyEditor !== undefined);
    }

    /**
     * Returns target environments to display
     *
     * @returns {TargetEnvironment[]} The target environments to display
     */
    // Steps
    @broadcast('completeDependencyEditorStep', {
        'launcherComponent.summary.dependencyEditor': {
            dependencySnapshot: 'dependencySnapshot'
        }
    })
    navToNextStep(): void {
        this.launcherComponent.navToNextStep();
    }

    /**
     * Navigate to step
     *
     * @param {string} id The step ID
     */
    navToStep(event: string) {
        this.launcherComponent.stepIndicator.navToStep(event);
    }

    updateTargetEnvSelection(): void {
        this.initCompleted();
    }

    public pickDependencies(event: any) {
        if (event) {
            this.launcherComponent.summary.dependencyEditor['dependencySnapshot'] = event;
        }
    }

    public pickMetadata(event: any) {
        if (event) {
            this.launcherComponent.summary.dependencyCheck.mavenArtifact = event.artifactId;
            this.launcherComponent.summary.dependencyCheck.groupId = event.groupId;
            this.launcherComponent.summary.dependencyCheck.projectVersion = event.version;

            // Update the dependency editor model
            this.launcherComponent.summary.dependencyEditor['mavenArtifact'] = event.artifactId;
            this.launcherComponent.summary.dependencyEditor['groupId'] = event.groupId;
            this.launcherComponent.summary.dependencyEditor['projectVersion'] = event.version;
        }
        setTimeout(() => {
            this.initCompleted();
        }, 10);
    }

    // Private
    private initCompleted(): void {
        this.launcherComponent.getStep(this.id).completed = this.stepCompleted;
    }

    private listenForChanges(change: any): void {
        let flag = false;
        let current = change.currentValue;
        if (!current) {
            return;
        }
        if (change && change.key === 'runtime') {
            if (
                !this.cacheInfo ||
                (
                    this.cacheInfo && this.cacheInfo.id !== current.id
                )
            ) {
                // Changes in any of them: name or version.id or version.name
                this.cacheInfo['runtime'] = {
                    name: current.name,
                    id: current.id,
                    missions: current.missions,
                    version: current.version ? current.version.id : null
                };
                flag = true;
            }
        } else if (change && change.key === 'mission') {
            this.cacheInfo['mission'] = {
                id: current.id
            };

            // If runtime is selected first, version of runtime will be null. This updates that.
            let missionsArrFromRuntime: Array<any> = this.cacheInfo['runtime'] && this.cacheInfo['runtime']['missions'];
            if (missionsArrFromRuntime && missionsArrFromRuntime.length) {
                let filteredMission =
                    missionsArrFromRuntime.filter((mission) => mission.id === this.cacheInfo['mission']['id'])[0];
                this.cacheInfo['runtime']['version'] =
                    filteredMission && filteredMission.versions && filteredMission.versions[0]
                        && filteredMission.versions[0].id || null;
            }
            flag = true;
        }

        if (flag) {
            if (this.cacheInfo['mission'] && this.cacheInfo['runtime']) {
                // this.cacheInfo = JSON.parse(this.cacheInfo);
                let mission: string = this.cacheInfo['mission'].id;
                let runtime: string = this.cacheInfo['runtime'].id;
                let runtimeVersion: string = this.cacheInfo['runtime'].version;
                this.boosterInfo = this.cacheInfo;
                if ( this.depEditorService) {
                    let service = this.depEditorService.getBoosterInfo(mission, runtime, runtimeVersion);
                    if (service) {
                        service.subscribe((response: any) => {
                            if (response && response.gitRepo && response.gitRef) {
                                this.github = response.gitRepo;
                                this.gitref = response.gitRef;
                            }
                        });
                    }
                }
            }
        }
    }

    // Restore mission & runtime summary
    private restoreSummary(): void {
        let selection: Selection = this.launcherComponent.selectionParams;
        if (selection !== undefined) {
            this.launcherComponent.summary.targetEnvironment = selection.targetEnvironment;
            this.launcherComponent.summary.dependencyCheck = selection.dependencyCheck;
            this.launcherComponent.summary.dependencyEditor = selection.dependencyEditor;
        }
        this.initCompleted(); // Ensure this is called for launcherComponent.targetEnvironment input
    }
}
