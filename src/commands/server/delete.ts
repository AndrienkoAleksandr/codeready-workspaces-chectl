/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { KubeConfig } from '@kubernetes/client-node'
import { Command, flags } from '@oclif/command'
import { boolean } from '@oclif/command/lib/flags'
import { cli } from 'cli-ux'
import * as Listrq from 'listr'

import { cheNamespace, listrRenderer } from '../../common-flags'
import { CheTasks } from '../../tasks/che'
import { OperatorTasks } from '../../tasks/installers/operator'
import { ApiTasks } from '../../tasks/platforms/api'

export default class Delete extends Command {
  static description = 'delete any CodeReady Workspaces related resource'

  static flags = {
    help: flags.help({ char: 'h' }),
    chenamespace: cheNamespace,
    'listr-renderer': listrRenderer,
    'skip-deletion-check': boolean({
      description: 'Skip user confirmation on deletion check',
      default: false
    }),
  }

  async run() {
    const { flags } = this.parse(Delete)

    const notifier = require('node-notifier')

    const apiTasks = new ApiTasks()
    const operatorTasks = new OperatorTasks()
    const cheTasks = new CheTasks(flags)

    let tasks = new Listrq(undefined,
      { renderer: flags['listr-renderer'] as any }
    )

    tasks.add(apiTasks.testApiTasks(flags, this))
    tasks.add(operatorTasks.deleteTasks(flags))
    tasks.add(cheTasks.deleteTasks(flags))

    const kc = new KubeConfig()
    kc.loadFromDefault()

    const cluster = kc.getCurrentCluster()

    if (!flags['skip-deletion-check']) {
      const confirmed = await cli.confirm(`You're going to remove CodeReady Workspaces server in namespace '${flags.chenamespace}' on server '${cluster ? cluster.server : ''}'. If you want to continue - press Y`)
      if (!confirmed) {
        this.exit(0)
      }
    }

    await tasks.run()

    notifier.notify({
      title: 'crwctl',
      message: 'Command server:update has completed.'
    })

    this.exit(0)
  }
}
