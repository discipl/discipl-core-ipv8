import { exec } from 'child_process'

export class Ipv8DockerUtil {
    static ipv8ContainerId: string;
    static CONTAINER_NAME = 'ipv8'

    static waitForContainersToBeReady (): Promise<void> {
      return new Promise((resolve, reject) => {
        const waitForPeers = setInterval(() => {
          exec('docker ps', (err, stdout) => {
            const isHealthy = stdout.includes('(healthy)')
            const isUnhealthy = stdout.includes('(unhealthy)')

            if (!err && isHealthy) {
              clearInterval(waitForPeers)
              resolve()
            }

            if (err || isUnhealthy) {
              reject(new Error('Container healthcheck failed'))
            }
          })
        }, 500)
      })
    }

    /**
     * Start a IPv8 docker container.
     * If the container is allready running this instance will be used instead.
     */
    static startIpv8Container (): Promise<void> {
      return new Promise((resolve, reject) => {
        exec(`docker build ./test/integration/ipv8 -t ${this.CONTAINER_NAME}:latest`, (err) => {
          if (err) {
            reject(err)
            return
          }

          console.log('starting IPv8 container...')

          exec(`docker run --network=host --rm --name ${this.CONTAINER_NAME} -d ${this.CONTAINER_NAME}`, (err, stdout) => {
            if (err) {
              reject(err)
              return
            }

            this.ipv8ContainerId = stdout
            resolve()
          })
        })
      })
    }

    /**
     * Kill the running IPv8 container
     */
    static killIpv8Container (): Promise<boolean> {
      return new Promise((resolve, reject) => {
        console.log('killing IPv8 container...')

        exec(`docker kill ${this.ipv8ContainerId}`, (err) => {
          if (err) {
            reject(err)
            return
          }

          resolve(true)
        })
      })
    }
}
