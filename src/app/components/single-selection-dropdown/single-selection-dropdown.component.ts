import { Component, Input, OnInit } from '@angular/core';
import { Input as GuiInput } from '../../model/base.model';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'single-selection-dropdown',
  templateUrl: './single-selection-dropdown.component.html',
  styleUrls: [ './single-selection-dropdown.component.less' ]
})
export class SingleSelectionDropDownComponent implements OnInit {

  @Input() field: GuiInput;
  @Input() form: FormGroup;
  @Input() inline: boolean;

  ngOnInit() {
    this.field.display = {open: false};
  }
  selected(choice: any) {
    this.field.value = choice.id;
    this.field.display.open = false;
  }
}
